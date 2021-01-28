---
title: Using Express with Strictly Typed Handlers and Responses
date: "2019-01-03T16:21:10.926Z"
---

I've recently came across a problem where I really didn't know how to approach,
which was adding strict typings onto Express middlewares and response types.
There seems to be no way to do this without messing half of `@types/express` and
`@types/node`:

```typescript{7-9}{numberLines: true}
import * as express from 'express'

const app = express()

app.get('/', (req: express.Request, res: express.Response) => {
  // I can't constrain the Send type!
  return res.status(400).send({
    error: '???',
  })
})
```

I've posted
[my question on /r/typescript](https://www.reddit.com/r/typescript/comments/aavk58/how_do_i_constrain_expressrequesthandlers_send_to/)
and Federico Feroldi (GitHub @cloudify) pointed me to
[his article](https://federicoferoldi.com/2017/12/28/using-the-typescript-type-system-to-validate-express-handlers.html)
about functional composition of Express middlewares with strict typings, but I
found it extremely confusing, so this is my attempt to explain how to add
compile-time type checking to your Express middlewares.

## First Thing's First

We first consider the terms and the behaviour below:

- **A middleware** takes a raw `express.Request` instance and
  - returns an object with type `T`, or
  - end the request early because something bad happened
- **A middleware handler** takes a bunch of `T`s from composed middlewares and
  returns **one** final response.

We can visualize **middlewares** like this, where `M_x` are the middlewares and
`R_x` are the responses of each corresponding middleware:

```typescript
function composeMiddlewares(M1, M2, M3, M4): [R1, R2, R3, R4]
```

Then, a **middleware handler** accepts responses `R_x` from the middlewares and
returns one response `IResponse<T>`

```typescript
function middlewareHandler<T>(R1, R2, R3, R4): IResponse<T>
```

## Defining the Response Type

We realize the response of a middleware, or a composition of middlewares with
the type `IResponse<T>`, where `T` is a string literal to discriminate between
different `IResponse`-s.

You can think of it as an intermediary type which is used internally to
represent a response, and provides an `apply` function that has an
`express.Response` so that you can tell express how to return an actual response
when presented the `IReponse<T>` type:

```typescript
type interface IResponse<T> {
    readonly kind: T,
    readonly apply: (response: express.Response) => void
}
```

### Example: `ResponseSuccessJson`

Here's an example of a response creator that creates an `IResponseSuccessJson`
returning a JSON with the status 200:

```typescript
interface IResponseSuccessJson<T> extends IResponse<"IResponseSuccessJson"> {
  readonly value: T
}

function ResponseSuccessJson<T>(o: T): IResponseSuccessJson<T> {
  return {
    apply: response =>
      response.status(200).json({
        ...o,
        kind: undefined,
      }),
    kind: "IResponseSuccessJson",
    value: o,
  }
}
```

### Example: `ResponseFailJson`

And here we have the same thing but returning a status of 400:

```typescript
interface IResponseFailJson<T> extends IResponse<"IResponseFailJson"> {
  readonly value: T
}

function ResponseFailJson<T>(o: T): IResponseFailJson<T> {
  return {
    apply: response =>
      response.status(400).json({
        ...o,
        kind: undefined,
      }),
    kind: "IResponseFailJson",
    value: o,
  }
}
```

## Defining the Request Middleware

Next, we have the request middleware definition `IRequestMiddleware`. A
`IRequestMiddleware` is a function that takes in an `express.Request` as a
parameter and returns a promise of `Either` the error response `IResponse<E>` or
a type `R`. The `Either` type is used to facilitate cases where a middleware
chain has to be stopped and a response has to be send immediately (more on this
later).

```typescript
import { Either } from "fp-ts/lib/Either"

type IRequestMiddleware<E, R> = (
  request: express.Request
) => Promise<Either<IResponse<E>, R>>
```

### Short Interlude on the `Either` Type

The `Either` type is provided by the
[`fp-ts` library](https://github.com/gcanti/fp-ts), and `Either` is a strict
**disjoint union** type.

It is by convention that the left type is the 'failure' state while the right
type is the 'success' state. We can use helper functions like `left` and `right`
to explicitly return the left or right type of a function.

```typescript
function greaterThanOne(n: number): Either<false, true> {
  return n > 1 ? right<false, true>(true) : left<false, true>(false)
}
```

Subsequently we can use `isLeft` and `isRight` to tell left and right values
apart.

```typescript
isLeft(greaterThanOne(3)) // false
isRight(greaterThanOne(3)) // true
```

## Middleware Composition

Now that we have the response and the request middleware typings, we can compose
middlewares by wrapping them with `withRequestMiddlewares`. If at any point of
time a middleware fails, an `IReponse<E>` is returned by using the `left`
function, which will bail out the whole middleware chain and return a response
of `IResponse<E>`.

```typescript{16-18,21-24,29-32}
import { left, right } from 'fp-ts/lib/Either'

type User = {
    id: string,
    name: string
}

type Profile = {
    id: string,
    picture: string
}

const middlewareOne: IRequestMiddleware<'IResponseFailJson', User> = async (request) => {
    if (/* condition */) {
        // return the left type of the Either type
        return left<IResponseFailJson, User>(ResponseFailJson({
            error: 'Your error goes here'
        }))
    } else {
        // return the right type of the Either type
        return right<IResponseFailJson, User>({
            id: '1',
            name: 'James'
        })
    }
}
const middlewareTwo: IRequestMiddleware<'IResponseFailJson', Profile> = async (request) => {/* */}

const requestHandler = withRequestMiddlewares(
    middlewareOne, // first middleware to fire
    middlewareTwo  // second middleware to fire
)(/* handler */)
```

Here's the definition and implementation of `withRequestMiddlewares`, note that
the middlewares are called one after another, and if a left value is returned,
we _resolve_ the left value and bail out from the middleware chain; otherwise,
we continue processing the next middleware.

```typescript
import { isLeft } from "fp-ts/lib/Either"

function withRequestMiddlewares<E1, E2, R1, R2>(
  m1: IRequestMiddleware<E1, R1>,
  m2: IRequestMiddleware<E2, R2>
): <O>(
  handler: (r1: R1, r2: R2) => Promise<IResponse<O>>
) => RequestHandler<E1, E2, O> {
  return request =>
    new Promise<IResponse<E1, E2, O>>((resolve, reject) => {
      m1(request).then(v1 => {
        if (isLeft(v1)) {
          // if the response of m1 was a left value, we bail
          resolve(v1.value)
        } else {
          m2(request).then(v2 => {
            if (isLeft(v2)) {
              // if the response of m2 was a left value, we bail
              resolve(v2.value)
            } else {
              // all values are resolved fine, we pass the values to the handler and call it
              handler(r1.value, r2.value).then(resolve, reject)
            }
          }, reject)
        }
      }, reject)
    })
}
```

## The Middleware Handler

The middleware handler is the bridge between the the internal data types of your
application and the actual interface that the consumer of an API gets. A
middleware handler takes all the response types of the middlewares, and then
returns an `IResponse<T>` which is then applied onto `express.Response`.

It is also a good abstraction layer that separates internal data structures from
API data structures, and also provides you a clear view of what can be returned
from a composition of middlewares.

Using the definitions above, we can write a `middlewareHandler` function, which
takes in two middleware results `User` and `Profile`, and returns a success JSON
of type `CompositeResponse`:

```typescript{19-30}
type CompositeResponse = {
  user: User
  profile: Profile
}

const middlewareOne = async (): IRequestMiddleware<
  'IResponseFailJson',
  User
> => {
  /* ... */
}
const middlewareTwo = async (): IRequestMiddleware<
  'IResponseFailJson',
  Profile
> => {
  /* ... */
}

const middlewareHandler: (
  user: User,
  profile: Profile
) => Promise<IResponseSuccessJson<CompositeResponse>> = async (
  user,
  profile
) => {
  return ResponseSuccessJson<CompositeResponse>({
    user,
    profile,
  })
}

// you don't have to type out the typings here,
// TypeScript will automatically infer it from the function call
const requestHandler: RequestHandler<
  'IResponseFailJson',
  'IResponseSuccessJson'
> = withRequestMiddlewares(middlewareOne, middlewareTwo)(middlewareHandler)
```

## Using our Request Handler with Express

Now that our middlewares have a handler, we want to tell Express to use and send
the resulting `IResponse<T>`.

With the handler example above, we can see that `requestHandler` can only return
either an `IResponseFailJson` or a `IResponseSucessJson`. However, when an
internal error (like `TypeError`) is thrown anywhere in the middleware chain, it
is automatically caught by the `error` function and a response type of
`ResponseErrorInternal` is returned to the consumer.

```typescript{11-13,16-18}
export type RequestHandler<R> = (
  request: express.Request
) => Promise<IResponse<R>>

export const wrapRequestHandler = <R>(
  handler: RequestHandler<R>
): express.RequestHandler => {
  return (request, response, _) => {
    return handler(request).then(
      // our custom responses are applied to express's response
      reply => {
        reply.apply(response)
      },
      // all other errors which are not handled properly are caught here,
      // and returned as ResponseErrorInternal
      error => {
        ResponseErrorInternal(error).apply(response)
      }
    )
  }
}

interface IResponseErrorInternal<T>
  extends IResponse<'IResponseErrorInternal'> {}

function ResponseErrorInternal(e: string): IResponseErrorInternal {
  return {
    apply: response =>
      response.status(500).json({
        title: 'Internal server error',
        detail: e.message,
      }),
    kind: 'IResponseErrorInternal',
  }
}
```

Using the predefined `requestHandler` with Express is as easy as wrapping the
request handler with `wrapRequestHandler`:

```typescript
import * as express from "express"

const app = express()

app.get("/api/test", wrapRequestHandler(requestHandler))
```

## Recap

To recap, we have:

- A bunch of middlewares that can return `Either<IResponse<E>, R>`
- A handler function that takes in the result `R` of each middleware and returns
  one `IResponse<T>`
- A `withRequestMiddlewares` function which maps the results of middlewares onto
  the handler function, and bails if an `E` type is emitted in any middleware
- A `wrapRequestHandler` function which calls and applies `IResponse<T>` onto
  `express.Request` via the `apply` function, catches other errors and emits
  them as an `ResponseErrorInternal`
