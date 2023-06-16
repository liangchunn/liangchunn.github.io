---
title: Sleep in Async Contexts
date: "2023-06-16T11:55:05.157Z"
---

I recently built a Rust library that allows you to query Impala databases for an API.

The library interfaces with an Impala database via the Thrift interface, namely via the interface defined by the [`TCLIService.thrift`](https://github.com/apache/hive/blob/master/service-rpc/if/TCLIService.thrift) definition file. Using the Apache Thrift CLI tool, the bindings file for Rust can be generated to be used with the [`thrift`](https://crates.io/crates/thrift) crate.

```sh
thrift -out src --gen rs -r ./thrift/TCLIService.thrift
```

The synchronous API was first built to test things out (which involves a lot of transformations like transposing rows, getting metadata, and more shenanigans). Then the asynchronous API was built with the help of [`bb8`](https://crates.io/crates/bb8) and [`thrift-pool`](https://crates.io/crates/thrift-pool) which allows the underlying TCP connections to be reused since they are expensive to reopen every time a query fires.

Since this was the first time I was touching code related to such low-level interfaces, there were some bugs like a query only returning a maximum of `1024` rows due to a limit imposed on the server side, requiring the query to be sent again _on the same session_ with all the same parameters.

Nonetheless, we deployed the first iteration of the product which uses this Impala libary and I noticed something weird.

### More CPUs, please

Since Impala iteself is kinda slow, I expected that the requests (that requires calling to Impala) to be slow. My response was to bump up the number of CPUs, since at the time of the pre-release, there was only 1 CPU instance allocated to the whole container running the server.

The reasoning was: if there's more CPUs, then the `actix-web` server can use more CPUs to run tasks, and there will be less contention between the system processes and the server.

After deploying the new version onto Google Cloud, I tested the application by requesting some routes, and everything _seemed fine_ to me.

### Shipping it

On the day of release, multiple users reported that there was issues loading resources from the API. They were being timed out constantly.

Looking at the logs, I found that some routes on the server which were not supposed to be slow, **were slow**.

An example is the `/auth` route. This route checks if your auth cookie is still valid, and it should be nearly instant (!), but it was taking **more than 4 seconds**, and sometimes even **more than 10 seconds** to be processed. When this happens, it triggers Google Cloud to timeout the request and return a HTTP 408, causing cascading errors to the users.

### The investigation

I tried to reproduce the issue on my local machine by limiting the server to only utilise 1 thread, firing requests to the slow endpoint, and then firing multiple requests to the fast endpoint in quick succession.

As expected (not to my advantage), the supposedly fast requests to `/auth` were being slow, and they were _suspiciously slow_ because the response times were _almost the same_ as the slow request on `/chart`!

![image showing slow requests to /auth and /chart](./sleep-before.png)

### The problem

As the title suggests, the problem is caused by the **usage of `std::thread::sleep` in an `async` context**.

```rust{10-11}
async fn wait_to_finish(
    &mut self,
    op: &TOperationHandle,
    start: &Instant,
) -> thrift::Result<()> {
    // ...

    let sleep_duration = get_sleep_duration(start);
    log::trace!(" sleeping for {:.2?}", sleep_duration);
    // Oops!
    std::thread::sleep(sleep_duration);

    // ...
}
```

I promptly switched the implementation to use `tokio::time::sleep` instead, which fixed the issue:

![image showing after fixes of faster /auth route](./sleep-after.png)

The documentation of `std::thread::sleep` says:

> Puts the current thread to sleep for at least the specified amount of time.
>
> The thread may sleep longer than the duration specified due to scheduling specifics or
> platform-dependent functionality. It will never sleep less.
>
> **This function is blocking, and should not be used in async functions.**

During the porting of the synchronous API to the asyncronous API of the Impala library, I didn't manage to catch this and mostly ported everything 1-to-1 (since the mechanism of firing queries is the same). I thought to myself: isn't there a clippy lint for this that could have caught this issue?

Turns out, _there isn't_.

There was an issue opened in `rust-clippy` titled ["Lint idea: find known-blocking constructs in async contexts"](https://github.com/rust-lang/rust-clippy/issues/4377), but it wasn't in favour to be implemented in clippy because it [requires global analysis](https://github.com/rust-lang/rust-clippy/pull/9857#issuecomment-1316377961), which is something that clippy shouldn't do due to perfomance reasons.

### Async mindfield

All of this reminds me of how difficult it is to implement `async` Rust. I remembered one time where I freaked out when I saw the `Future` trait:

```rust
pub trait Future {
    type Output;

    // Required method
    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
}
```

> `Pin`? `Poll`? What the hell is this? Let me see the definitions... oh, okay nevermind.

Suffice to say I quietly stepped away from this, and I just _never_ return `Future`-y things from functions or even try to touch `Future` related things by using `async fn` and `.await` everywhere that I could. Maybe one day I am able to muster the confidence and invest time to _truly_ understand the underlying mechanism of `Future`s.

Don't get me wrong, I am quite satisfied with how Rust handles async and being extremely explicit, but I do wish there was some tool that would have caught this issue for me, which would have in turn make working with `async` easier.

### Take aways

Some key take-aways:

- Be aware of blocking constructs in async contexts
- Never blindly port 1-to-1 from a synchronous implementation
- Take good care when implementing async
