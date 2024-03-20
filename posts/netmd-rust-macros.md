---
title: Extracting NetMD messages with Rust macros
description: Compile-time typed message extraction for the NetMD protocol with Rust macros 💽
date: 2024-03-19
tags:
  - rust
  - dx
---


I was recently using the amazing [Web MiniDisc](https://stefano.brilli.me/webminidisc/) 💽 tool written by [Stefano Brilli](https://github.com/cybercase), which allows you to rename, upload, delete, and move tracks on a MiniDisc hooked up to a NetMD player via USB. This amazed me not only because it's written entirely in TypeScript, but also because it's a web app, interfacing with NetMD devices via [WebUSB](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API) and using a compiled version of [ffmpeg targeting WebAssembly](https://github.com/ffmpegwasm/ffmpeg.wasm) for audio conversion.


<center>![](/images/md-tx.svg)</center>


Me being me, this prompted to me to make an attempt to rewrite (at least) the protocol in Rust. The Web MiniDisc web app uses the library [`netmd-js`](https://github.com/cybercase/netmd-js) that the same author ported from [`linux-minidisc`](https://github.com/linux-minidisc/linux-minidisc) to interface with NetMD devices.

After a few attempts of reading the `netmd-js` source code and porting it over to Rust, my program was able to read and print out the disc title and total number of tracks from my Sony MZ-N505 player!

I was very happy with the results, except, there were a few ugly lines of code that _irked_ me.

![Sony MZ-N505 MiniDisc Player with two MiniDiscs](/images/md.webp)
_My personal Sony MZ-N505 MiniDisc player_

## Reading the disc title

After sending a query to a NetMD device, the device first responds with a header which tells you how many bytes to expect. The program then allocates a buffer with the aforementioned number of bytes, and the data is written into the buffer.

Each data frame that comes from the device has a known format. In the case of reading disc titles, the format looks like this:

```plaintext
%? 1806 02201801 00%? 3000 0a00 1000 %w0000 %?%?000a %w %*
```

The definition of placeholders for our example above are as follows:

- `%?`: any byte (we don't want to parse or match this)
- `%b`: one byte
- `%w`: two bytes (word) in big endian order
- `%*`: raw `Vec<u8>` buffer

For our case, we want to read:

- two bytes `%w` in big endian which represents the current chunk size
- two bytes `%w` in big endian which represents the number of total chunks
- the rest bytes in raw `%*`: the disc title of the MiniDisc, [Shift JIS](https://en.wikipedia.org/wiki/Shift_JIS) encoded (may be incomplete, but we'll ignore that for now)

I've written a function called `scan(){:rs}` (which is semi-analagous to the [original `scanQuery(){:ts}` function implemented in TypeScript](https://github.com/cybercase/netmd-js/blob/8a4b1a8e4d06fd6e8a42a938a566514f6da9a14e/src/query-utils.ts#L115)), that

- returns data matched to their placeholders as a `Vec<&'a [u8]>{:rs}`
- matches all defined bytes 1-to-1 in order (the non-placeholder part)

```rust
fn scan<'a>(template: &'a str, data: &'a [u8]) -> Result<Vec<&'a [u8]>, ()> {}
```

Here's the usage of `scan(){:rs}` and what _irked_ me:

```rust
let data = scan("%? 1806 02201801 00%? 3000 0a00 1000 %w0000 %?%?000a %w %*", reply)?;

if let [chunk_size_read, total_read, data_read] = &data[..] {
    chunk_size = parse_u16(chunk_size_read)?;
    total = parse_u16(total_read)?;
    sink.push(parse_string(data_read)?);
} else {
    unreachable!()
}
```

I didn't like this code, especially the part where I'm destructuring `data` into three raw `&&[u8]{:rs}`s that I needed to then manually parse into `u16{:rs}`s and `String{:rs}`s, and not to mention `unreachable!(){:rs}`.

Rust complains when you do not add the `if let {} else {}` part, as the `let{:rs}` binding _requires_ an [irrefutable pattern](https://doc.rust-lang.org/book/ch18-02-refutability.html) match:

```ansi title="Shell session"
[1m[32m   Compiling[0m scan-test v0.1.0
[0m[1m[38;5;9merror[E0005][0m[0m[1m: refutable pattern in local binding[0m
[0m [0m[0m[1m[38;5;12m--> [0m[0mscan-test/src/main.rs:5:9[0m
[0m  [0m[0m[1m[38;5;12m|[0m
[0m[1m[38;5;12m5[0m[0m [0m[0m[1m[38;5;12m|[0m[0m [0m[0m    let [a, b] = &data[..];[0m
[0m  [0m[0m[1m[38;5;12m| [0m[0m        [0m[0m[1m[38;5;9m^^^^^^[0m[0m [0m[0m[1m[38;5;9mpatterns `&[]`, `&[_]` and `&[_, _, _, ..]` not covered[0m
[0m  [0m[0m[1m[38;5;12m|[0m
[0m  [0m[0m[1m[38;5;12m= [0m[0m[1mnote[0m[0m: `let` bindings require an "irrefutable pattern", like a `struct` or an `enum` with only one variant[0m
[0m  [0m[0m[1m[38;5;12m= [0m[0m[1mnote[0m[0m: for more information, visit https://doc.rust-lang.org/book/ch18-02-refutability.html[0m
[0m  [0m[0m[1m[38;5;12m= [0m[0m[1mnote[0m[0m: the matched value is of type `&[u8]`[0m
[0m[1m[38;5;14mhelp[0m[0m: you might want to use `let else` to handle the variants that aren't matched[0m
[0m  [0m[0m[1m[38;5;12m|[0m
[0m[1m[38;5;12m5[0m[0m [0m[0m[1m[38;5;12m| [0m[0m    let [a, b] = &data[..][0m[0m[38;5;10m else { todo!() }[0m[0m;[0m
[0m  [0m[0m[1m[38;5;12m|[0m[0m                            [0m[0m[38;5;10m++++++++++++++++[0m

[0m[1mFor more information about this error, try `rustc --explain E0005`.[0m
[1m[31merror[0m[1m:[0m could not compile `scan-test` (bin "scan-test") due to 1 previous error

```

All these manual extraction and type conversion didn't seem sane to me, as I can still make mistakes such as:

- specifying too few destructures because I misread the template
- adding a new placeholder in the template and forgetting to add another destructure
- specifying the wrong `parse_*` types

I thought about adding a generic type `T{:rs}` and specifying that type on the call site, but the problems above still can happen, and the compiler will not complain:

```rust
fn scan<'a, T>(template: &'a str, data: &'a [u8]) -> Result<T, ()> {}

let (a, b) = scan("%? %w %b", &[0x00, 0x01, 0x02, 0x03])?;
//  ^^^^^^   ---- type must be known at this point


let (a, b) = scan::<(u8, u16)>("%? %w %b", &[0x00, 0x01, 0x02, 0x03])?;
//                   ^---^---+      ^--^
//                           |         |
//                           +---------+---  whoops, wrong order
```

Either way, I don't think there's a way to return variadic tuples. How can I implement `scan(){:rs}` in a way that `T{:rs}` can be a tuple of any length?

_If only there is another way..._

## A cleaner API

Let's wrap everything that we know before, and throw (almost) all of it out the window. Personally I like to delete code and start over — knowing what I want, and what I don't want from the code that I'm writing.

I would like an API that looks something like this:

```rust
let () = scan("ff", data);
//  ^-- nothing

let (a) = scan("ff %b", data);
//   ^-- inferred as u8

let (a, b) = scan("ff be %b %w", data);
//   ^--^-- inferred as one u8 and one u16
```

Since the template string literal contains a known amount of placeholders and is `'static{:rs}`, the return type of `scan(){:rs}` should aptly correspond to the same number of values with its associated type, contained in a tuple. For example:

- `%b de ad be ef %w`: contains 2 values `(u8, u16){:rs}`
- `ca fe ba be`: no placeholders `(){:rs}`
- `00 %*`: match-to-end wildcard of raw bytes `&[u8]{:rs}`

We can also leverage type-inference to our advantage. In an isolated example, the following code will automatically infer the return types.

```rust title="Type inference"
let (a, b) = (0 as u8, 1 as u16);
//   ^  ^─── inferred as `u16`
//   └────── inferred as `u8`
```

With that, we want our function `scan(){:rs}` to return a concrete type which is known at compile time, and it should roughly work like the following:

```rust
// this code snippet
let (a, b) = scan("ff be %b %w", data)

// should expand to
let (a, b) = {
    // extract placeholder values from data
    let extracted = extract("ff be %b %w", data).unwrap();
    // extract first %b (u8)
    let r1 = {
        let raw = extracted.get(0).unwrap();
        let val = u8::from_be_bytes(<[u8; 1]>::try_from(*raw).unwrap());
        val
    };
    // extract second %w (u16)
    let r2 = {
        let raw = extracted.get(1).unwrap();
        let val = u16::from_be_bytes(<[u8; 2]>::try_from(*raw).unwrap());
        val
    };

    // r1 should be a u8, and
    // r2 should be a u16
    (r1, r2)
};
```

## Generating code with macros

[Macros](https://doc.rust-lang.org/book/ch19-06-macros.html) are a way of writing code that writes other code (very [meta](https://en.wikipedia.org/wiki/Metaprogramming)). You've probably used macros before, such as the declarative `println!{:rs}` macro, or using `#[derive(Serialize)]` derive macros from [`serde`](https://github.com/serde-rs/serde).

From the previous vision of a cleaner API, we would like some sort of way to _automatically_ implement that block for us, be it none, two, three, or _n_ amounts of placeholders. Turns out, we can use [function-like procedural macros](https://doc.rust-lang.org/reference/procedural-macros.html) to do exactly what we want.

Before getting started, we need a way to inspect our macro output. Fortunately I didn't have to look far until I stumbled upon the [`cargo-expand` crate](https://github.com/dtolnay/cargo-expand). This cool utility allows us to take a peek into expanded macros, just like [how `rustc` would do during compile time](https://rustc-dev-guide.rust-lang.org/macro-expansion.html).

```rust title="Example"
fn main() {
    let world = "world";
    println!("Hello, {}!", world);
}
```

Running `cargo expand` outputs:

```rust title="Example (expanded)"
#![feature(prelude_import)]
#[prelude_import]
use std::prelude::rust_2021::*;
#[macro_use]
extern crate std;
fn main() {
    let world = "world";
    {
        // NOTE: `format_args!` doesn't expand
        // NOTE: because it's a compiler built-in
        ::std::io::_print(format_args!("Hello, {0}!\n", world));
    };
}
```

## Implementing our own macro

> This section implies you have pre-knowledge of macros and the basics on how they work. I've intentionally left out step-by-step instructions and instead focused on how to formulate the solution to the problem. If in doubt, please refer to reputable references, or get your hands dirty on the [source code mentioned at the end of this article](#references).

Remember that our `scan(){:rs}` function takes two inputs:

- a string template of `&'static str{:rs}`
- a data buffer of `&[u8]{:rs}`

We would like our `scan!{:rs}` macro to:

- match, in order, the bytes defined in the template
- extract all placeholder data into typed data

```rust
let data =       &[0xff, 0xbe, 0x01, 0x02, 0x03];
//                   ↑     ↑     ↑    ↑      ↑
//                   │     │     │    ├──────┘
//                   ↓     ↓     ↓    ↓
let (a, b) = scan!(" ff    be    %b   %w", data);
```

We can represent the input tokens of the macro with the following `struct{:rs}`:

```rust title="scan-core/src/lib.rs"
use syn::{parse::Parse, Expr, LitStr, Token};

//                        scan!("ff be %b %w", data)
//                              ↑            ↑ ↑
//                              │            │ │
pub struct MacroInput { //      │            │ │
    template: LitStr,   //  ────┘            │ │
    _comma: Token![,],  //  ─────────────────┘ │
    data: Expr,         //  ───────────────────┘
}

impl Parse for MacroInput {
    // ...
}
```

`MacroInput{:rs}` can then be used in a `generate(){:rs}` function that returns a `TokenStream{:rs}`, which is a stream of tokenized representations of Rust code that will be inlined as code. The example below uses the `quote!{:rs}` macro that inlines the template string literal and the data as a tuple:

```rust title="scan-core/src/lib.rs"
pub fn generate(input: MacroInput) -> TokenStream {
    let template = input.template.value();
    let data = &input.data;

    quote!((#template, #data))
}
```

In a separate crate, we can test our preliminary `scan!{:rs}` macro by running `cargo expand`, which will show that the macro is expanding to a tuple of the expected type `(&str, &[u8]){:rs}`!

```rust title="Example"
use scan::scan;

fn main() {
    let data = &[0xff, 0xbe, 0x01, 0x02, 0x03];
    let (a, b) = scan!("ff be %b %w", data);

    // the line above is expanded into:
    let (a, b) = ("ff be %b %w", data);
    // the types that are inferred are:
    //   a: &str
    //   b: &[u8]
}
```

For the placeholders `%_`, we can use an `enum{:rs}` representation that facilitates type conversion after extracting data:

```rust title="scan-core/src/lib.rs"
enum Placeholder {
    Byte,     // %b
    Word,     // %w
    Double,   // %d
    Quad,     // %q
    RawRest,  // %*
}
```

We then implement `quote::ToTokens{:rs}` for the newtype `Template{:rs}` that converts the enclosed `Vec<Placeholder>{:rs}` into a `TokenStream{:rs}` which can then be interpolated:

```rust title="scan-core/src/lib.rs"
struct Template(Vec<Placeholder>);

impl ToTokens for Template {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let all_tokens = self
            .0
            .iter()
            .enumerate()
            .map(|(index, placeholder_type)| {
                // get the extracted value
                let getter = quote!(
                    let value = extracted.get(#index).unwrap()
                );

                // perform the type conversion
                let converter = match placeholder_type {
                    Placeholder::Byte => quote! {
                        u8::from_be_bytes(<[u8; 1]>::try_from(*value).unwrap())
                    },
                    Placeholder::Word => quote! {
                        u16::from_be_bytes(<[u8; 2]>::try_from(*value).unwrap())
                    },
                    Placeholder::Double => quote! {
                        u32::from_be_bytes(<[u8; 4]>::try_from(*value).unwrap())
                    },
                    Placeholder::Quad => quote! {
                        u64::from_be_bytes(<[u8; 8]>::try_from(*value).unwrap())
                    },
                    Placeholder::RawRest => quote! {
                        *value
                    },
                };

                quote!({
                    #getter;
                    #converter
                })
            })
            .collect::<Vec<_>>();

        tokens.extend(quote!(
            (#(#all_tokens),*)
        ))
    }
}
```

Let's break it down:

We're enumerating `Vec<Placeholder>{:rs}` and mapping it into tokens where:

- `#getter` gets the value at index `#index` of the `extracted` variable, and binds the result to a variable `value`
- `#converter` matches the `Placeholder{:rs}` and performs the associated conversion on the bound `*value`

We then assemble the getter and the converter in a `{}{:rs}` block with `quote!{:rs}`:

```rust
let block = quote!({
    #getter;
    #converter
})

// for example, a `Placeholder::Byte` with the index 0 returns:
let block = {
    let value = extracted.get(0).unwrap();
    u8::from_be_bytes(<[u8; 1]>::try_from(*value).unwrap())
}
```

```plaintext
quote!(        ╭───────────────────────────────────────────────╮
    {          ↓       {                                       ↓
        #getter;          let value = extracted.get(0).unwrap();
        ↑                 ↑
        ╰─────────────────╯
        #converter        u8::from_be_bytes(...)
        ↑                 ↑
        ╰─────────────────╯
    {                  {
)
```

We then collect all the tokens into the variable `all_tokens` with the type `Vec<TokenStream>{:rs}`, and call `tokens.extend(){:rs}` to extend the existing `TokenStream{:rs}` by [interpolation and repetition](https://docs.rs/quote/1.0.35/quote/macro.quote.html#interpolation) of `all_tokens`:

```rust
let tokens = quote!(
    (
        #(#all_tokens),*
    )
)

// for example:
//   - a `Placeholder::Byte` at index 0
//   - a `Placeholder::Word` at index 1
let tokens =
    (
        {
            let value = extracted.get(0).unwrap();
            u8::from_be_bytes(<[u8; 1]>::try_from(*value).unwrap())
        },
        {
            let value = extracted.get(1).unwrap();
            u16::from_be_bytes(<[u8; 2]>::try_from(*value).unwrap())
        },
    )
}
```

```plaintext
quote!(
    (
        #(#all_tokens),*
    )                 ↑
)                     │
                      ╰─────────────╮
    (                               │
        ╭─────────────────╮         │
        │ {               │         │
        │   all_tokens[0] │         │
        │ }               │ , ←─────┤
        ╰─────────────────╯         │
        ╭─────────────────╮         │
        │ {               │         │
        │   all_tokens[1] │         │
        │ }               │ , ←─────╯
        ╰─────────────────╯
    )
```

Then, we define a function `parse_template(){:rs}`, that parses the template string literal into our newtype `Template{:rs}`, and another function `extract(){:rs}` that is used and executed during runtime which returns all the extracted bytes in-order as a `Vec<&'a [u8]>{:rs}`:

```rust title="scan-core/src/lib.rs"
// compile-time template parsing
fn parse_template(input: &str) -> Result<Template, ()> {
    // ...
}

// runtime extractor
pub fn extract<'a>(template: &'a str, data: &'a [u8]) -> Result<Vec<&'a [u8]>, ()> {
    // ...
}
```

These two functions can then be used inside our `generate(){:rs}` function:

```rust title="scan-core/src/lib.rs" /parse_template/#blue /::scan::extract/#blue
pub fn generate(input: MacroInput) -> TokenStream {
    let template_str = input.template.value();
    let template = parse_template(&template_str).unwrap();
    let data = &input.data;

    quote! ({
        let extracted = ::scan::extract(#template_str, #data).unwrap();
        #template
    })
}
```

The `Template{:rs}` that is generated with `parse_template(){:rs}` is interpolated with the `ToTokens{:rs}` implementation that we have covered before, and the basics are done!

With type inference, `a{:rs}` is correctly inferred as a `u8{:rs}`, and `b{:rs}` as a `u16{:rs}`!

```rust title="Example"
use scan::scan;

fn main() {
    let data = &[0xff, 0xbe, 0x01, 0x02, 0x03];
    let (a, b) = scan!("ff be %b %w", data);

    // expands to:
    let (a, b) = {
    //   ↑  ↑
    //   │  └── u16 🥳
    //   └───── u8  🤩
        let extracted = ::scan::extract("ff be %b %w", data).unwrap();
        (
            {
                let value = extracted.get(0usize).unwrap();
                u8::from_be_bytes(<[u8; 1]>::try_from(*value).unwrap())
            },
            {
                let value = extracted.get(1usize).unwrap();
                u16::from_be_bytes(<[u8; 2]>::try_from(*value).unwrap())
            },
        )
    };
}
```

## Error handling

Despite using a [healthy dose of `.unwrap(){:rs}`s](https://blog.burntsushi.net/unwrap/), we would ideally return custom `Error{:rs}` types. This can be done with the help of the fantastic [`thiserror` crate](https://github.com/dtolnay/thiserror) that does the heavy lifing for us.

For our usage, we want to define two error types:

- `CompileError{:rs}` representing _compile-time_ errors, such as invalid hex characters within the template string literal
- `ExtractError{:rs}` representing _runtime_ extraction errors, such as missing, mismatched or residual unparsed data

```rust title="scan-core/src/error.rs"
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CompileError {
    #[error("invalid hex character '{0}'")]
    InvalidHexCharacter(char),
    // ...
}

#[derive(Error, Debug)]
pub enum ExtractError {
    #[error("data buffer contains unmatched residual data")]
    ResidualData,
    // ...
}
```

The two error types can be used in our `parse_template(){:rs}` and `extract(){:rs}`, replacing the previous unit type `(){:rs}`:

```rust title="scan-core/src/lib.rs" {1-2} /CompileError/2#blue /ExtractError/2#yellow
pub use error::{CompileError, ExtractError};
mod error;

fn parse_template(input: &str) -> Result<Template, CompileError> {
    // ...
}

pub fn extract<'a>(/* snip */) -> Result<Vec<&'a [u8]>, ExtractError> {
    // ...
}
```

We can then update all occurrences of `.unwrap(){:rs}` to `?{:rs}` or `.map_err()?{:rs}` wherever applicable, and update our `generate(){:rs}` macro entry to propagate errors to the Rust compiler:

```rust {7-10,12} title="scan-core/src/lib.rs"
pub fn generate(input: MacroInput) -> TokenStream {
    let template_str = input.template.value();
    let template = parse_template(&template_str);
    let data = &input.data;

    match template {
        Ok(template) => quote!({
            let extracted = ::scan::extract(#template_str, #data)?;
            Ok(#template)
        }),
        // convert our CompileError into a compile error
        Err(e) => syn::Error::new(input.template.span(), e).to_compile_error(),
    }
}
```

Now, let's try compiling our example code with `cargo run`:

```ansi title="Shell session"
[1m[32m   Compiling[0m scan-test v0.1.0 
[0m[1m[38;5;9merror[E0277][0m[0m[1m: the `?` operator can only be used in a function that returns `Result` or `Option` (or another type that implements `FromResidual`)[0m
[0m [0m[0m[1m[38;5;12m--> [0m[0mscan-test/src/main.rs:5:43[0m
[0m  [0m[0m[1m[38;5;12m|[0m
[0m[1m[38;5;12m3[0m[0m [0m[0m[1m[38;5;12m|[0m[0m [0m[0mfn main() {[0m
[0m  [0m[0m[1m[38;5;12m| [0m[0m[1m[38;5;12m---------[0m[0m [0m[0m[1m[38;5;12mthis function should return `Result` or `Option` to accept `?`[0m
[0m[1m[38;5;12m4[0m[0m [0m[0m[1m[38;5;12m|[0m[0m [0m[0m    let data = &[0xff, 0xbe, 0x01, 0x02, 0x03];[0m
[0m[1m[38;5;12m5[0m[0m [0m[0m[1m[38;5;12m|[0m[0m [0m[0m    let (a, b) = scan!("ff be %b %w", data).unwrap();[0m
[0m  [0m[0m[1m[38;5;12m| [0m[0m                                          [0m[0m[1m[38;5;9m^[0m[0m [0m[0m[1m[38;5;9mcannot use the `?` operator in a function that returns `()`[0m
[0m  [0m[0m[1m[38;5;12m|[0m
[0m  [0m[0m[1m[38;5;12m= [0m[0m[1mhelp[0m[0m: the trait `FromResidual<Result<Infallible, ExtractError>>` is not implemented for `()`[0m
[0m  [0m[0m[1m[38;5;12m= [0m[0m[1mnote[0m[0m: this error originates in the macro `scan` (in Nightly builds, run with -Z macro-backtrace for more info)[0m

[0m[1mFor more information about this error, try `rustc --explain E0277`.[0m
[1m[31merror[0m[1m:[0m could not compile `scan-test` (bin "scan-test") due to 1 previous error
```

Oops, we hit a compile error.

No worries! We can use `cargo expand` to expand our test code that will help us illustrate the problem:

```rust {3-9} title="Example (Expanded)"
fn main() {
    let data = &[0xff, 0xbe, 0x01, 0x02, 0x03];
    let (a, b) = {
        let extracted = ::scan::extract("ff be %b %w", data)?;
        Ok((
            { /* snip: this closure uses `?` */ },
            { /* snip: this closure uses `?` */ },
        ))
    }.unwrap()
}
```

The block `let (a, b) = { /* ... */ }{:rs}` uses the `?{:rs}` operator which returns to the nearest function or closure. In our case, it's the `main(){:rs}` function; but it's not allowed since the `main(){:rs}` function returns a unit type `(){:rs}`. We could change it so that it returns a `Result{:rs}`, but I wanted it to act like calling a function, so that's off the table.

An alternative is to wrap the block with a [`try` block](https://github.com/rust-lang/rust/issues/31436). Although this is ocularly pleasant and terse, it requires an unstable nightly feature flag `#![feature(try_blocks)]`:

```rust title="Example (Expanded, with try)" /try/2#red
#![feature(try_blocks)]
fn main() {
    let data = &[0xff, 0xbe, 0x01, 0x02, 0x03];
    let (a, b) = try {
        let extracted = ::scan::extract("ff be %b %w", data)?;
        Ok((
            { /* snip: this closure uses `?` */ },
            { /* snip: this closure uses `?` */ },
        ))
    }.unwrap()
}
```

Rather than fiddling with unstable feature flags, a workaround is to use an [IIFE](https://en.wikipedia.org/wiki/Immediately_invoked_function_expression) `(|| {})(){:rs}` with an explicit return type:

```rust {5,8} title="scan-core/src/lib.rs" 
pub fn generate(input: MacroInput) -> TokenStream {
    // ...
    match template {
        Ok(template) => quote! {
            (|| -> Result<_, ::scan::ExtractError> {
                let extracted = ::scan::extract(#template_str, #data)?;
                Ok(#template)
            })()
        },
        Err(e) => syn::Error::new(input.template.span(), e).to_compile_error(),
    }
}

```

which expands our code into the following, while preserving type inference on the `Ok{:rs}` variant:

```rust title="Example (Expanded)"
fn main() {
    let data = &[0xff, 0xbe, 0x01, 0x02, 0x03];
    let (a, b) = (|| -> Result<_, ::scan::ExtractError> {
        let extracted = ::scan::extract("ff be %b %w", data)?;
        Ok((
            { /* snip: this closure uses `?` */ },
            { /* snip: this closure uses `?` */ },
        ))
    })().unwrap();
}
```

## Testing it out

Let's try out the full example where we match two bytes`0xff{:rs}` and `0xbe{:rs}`, and extract a `u8{:rs}` and a `u16{:rs}`:

```rust title="scan-test/src/main.rs"
use scan::scan;

fn main() {
    let data = &[0xff, 0xbe, 0x01, 0x02, 0x03];
    let (a, b) = scan!("ff be %b %w", data).unwrap();
    println!("a = {a}, b = {b}");

    let c = 0x01;
    let d = u16::from_be_bytes([0x02, 0x03]);
    println!("c = {c}, d = {d}");

    assert_eq!(a, c);
    assert_eq!(b, d);
}
```

Running `cargo run` outputs:

```ansi title="Shell session"
[1m[32m   Compiling[0m scan-core v0.1.0 
[1m[32m   Compiling[0m scan-macros v0.1.0 
[1m[32m   Compiling[0m scan v0.1.0
[1m[32m   Compiling[0m scan-test v0.1.0
[1m[32m    Finished[0m dev [unoptimized + debuginfo] target(s) in 0.55s
[1m[32m     Running[0m `target/debug/scan-test`
a = 1, b = 515
c = 1, d = 515
```

It works, and there's no assert panics! 🥳

## Rounding it up

With all this effort being made, we can _finally_ convert our original snippet:

```rust title="Before"
let data = scan("%? 1806 02201801 00%? 3000 0a00 1000 %w0000 %?%?000a %w %*", reply)?;

if let [chunk_size_read, total_read, data_read] = &data[..] {
    chunk_size = parse_u16(chunk_size_read)?;
    total = parse_u16(total_read)?;
    sink.push(parse_string(data_read)?);
} else {
    unreachable!()
}
```

to use our `scan!{:rs}` macro:

```rust title="After"
let (chunk_size_r, total_r, data) =
    scan("%? 1806 02201801 00%? 3000 0a00 1000 %w0000 %?%?000a %w %*", reply)?;

chunk_size = chunk_size_r;     // chunk_size_r: u16
total = total_r;               // total_r: u16
sink.push(parse_string(data))  // data: Vec<u8>
```

Much better! Especially without the awkward `if let [a, b] = &data[..]{:rs}` and `unreachable!(){:rs}`!

The compiler can now:

- automatically infer the number of elements in the tuple
- infer the type associated with the placeholders
- provide feedback if I've messed up the template string

Exactly what I needed! Though I could also eliminate `parse_string(data){:rs}` — maybe a with a template placeholder like `%*S` with the associated type `Placeholder::StringRest{:rs}`?

## Final thoughts

Writing macros isn't _easy_ nor _simple_. Since I hadn't really stumbled upon a good guide on macros, I experimented it myself instead: reading documentation, searching for examples, looking at GitHub issues, before getting stuff working properly.

To be fair, this isn't my first time writing macros.

Last year, I had to write an [Impala](https://impala.apache.org/) query library for work which interfaces via [Apache Thrift](https://thrift.apache.org/). I needed a way to transform a data row into a `struct{:rs}` using a derive macro, which should look like [`sqlx`](https://github.com/launchbadge/sqlx)'s [`FromRow{:rs}`](https://docs.rs/sqlx/0.7.4/sqlx/trait.FromRow.html) API. I ended up browsing `sqlx`'s source code and figuring out how code was generated, and adapted my macro to use my own getters and transformers.

```rust /#[derive(FromRow)]/
use sqlx::FromRow;

#[derive(FromRow)]
struct User {
    // ...
}
```

```rust /#[derive(FromImpalaRow)]/
use impala::FromImpalaRow;

#[derive(FromImpalaRow)]
struct User {
    // ...
}
```

People have done crazy and impressive things with macros, like [yew's `html!` macro](https://yew.rs/docs/concepts/html):

```html
use yew::prelude::*;

html! {
    <div>
        <div data-key="abc"></div>
        <div class="parent">
            <span class="child" value="anything"></span>
            <label for="first-name">{ "First Name" }</label>
            <input type="text" id="first-name" value="placeholder" />
            <input type="checkbox" checked=true />
            <textarea value="write a story" />
            <select name="status">
                <option selected=true disabled=false value="">{ "Selected" }</option>
                <option selected=false disabled=true value="">{ "Unselected" }</option>
            </select>
        </div>
    </div>
};
```

In the end, I think it's worth it to invest some effort into providing better APIs for your own libraries and utilities. Sure, it might be a little overkill for some cases, but you would _certainly_ still learn something from it.

That said, time to go back to experimenting talking to NetMD devices with Rust!

---

## References

- Source code: https://github.com/liangchunn/scan-macro-example
- MiniDisc logo source (GPLv2): [md0.svg](https://github.com/cybercase/webminidisc/blob/72473709cc47fa32c4e5c9ccb77fc6ee739a9c39/src/images/md0.svg)
