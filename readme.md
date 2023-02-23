
# jlc-logger

An [ES module](https://nodejs.org/api/esm.html#esm_modules_ecmascript_modules) allowing logging in [Node.js](https://nodejs.org/) to be something that is kind of sexy.

## Released as is

For now I've decided to share this project as it is; which could mean missing documentation, tests and information. Maybe even an incomplete readme full of errors. I just wanted to have it available online...

## Features:
* Cross module logging using whichever logging functions you desire; because you're free to implement them yourself!
* Inbuilt sane defaults such as `log()` using `console.log` and `log.debug()` (if enabled) using `console.debug`.
* Easily allows logging to files.
* Easily allows using externally defined logging functions (ES modules where the `default export` is a `function`).
* Easily allows turning logging functions on and off (at runtime) depending on what you think is interesting to the end user. *Tip: `log.debug()` is off by default.*
* Allows different modules to use the same logging functions but with different prefixes (optionally) to know which module logged what.
* Very easy to use! (to me the API is very sexy ~~and turns me on~~)

## Requirements:
* Node.js version >= 14.3 (because I used top-level await ~~and I don't really care about supporting legacy code maintained by dinosaurs~~)

## Install using NPM:
```bash
npm install jlc-logger
```

## Install optional dependency for coloring of the default loggers:
If `chalk` is located in the same `node_modules` folder as jlc-logger then it is going to take advantage of it ~~(not in a nasty way)~~ to color some of the loggers (e.g. debug, warn and error). Just execute:
```bash
npm install chalk
```

## How it works (just jump to the examples if bored):
Through the `log` import you can access every function defined for logging purposes. We have enabled some defaults like the boring `log` for all kinds of generic output and `log.verbose`, `log.debug` for the more exciting stuff. And `log.warn`, `log.error`, `log.fatalError` for the seriously dangerous stuff! ~~*(please don't hurt yourself)*~~ And if you just want to quit the program with a message you could do so with `log.exit('Thanks for all the fish')`.

The functions used to log or output text for all of these can be disabled or enabled with the `setLoggers` function. It also allows you to easily define your own functions replacing any of these inbuilt ones as well as defining functions for new loggers, e.g. `log.whateverYouWant('Because you can!')`.

Like log.exit `log.fatalError` will also cause the program to stop (internally using `process.exit()` with a positive exit code of `1` (if you didn't set a positive code yourself using `process.exitCode`). And you can't disable it from doing so even if you disabled its text output!

I've also implemented `log.groupStart` and `log.groupEnd` which just executes the `console` versions of these functions. Those functions will of course need to be overridden if you want them to work with logger functions not using `console`.

But I guess it's time for some examples now!

## Examples:

### If you're happy with the loggers that are set up for you:
```javascript
// btw, for colors just do: npm install chalk
import {log} from 'jlc-logger'

log('Hello world!')
log.verbose('Could be interesting for some people')
log.debug('Should only be interesting to developers I guess')
log.ghfdsdjsd('Probably not interesting to anyone or even implemented, but it will not cause any errors calling it')
log.warn('Something bad is about to happen, maybe...')
log.error('Something a little bad happened, but we will continue!')
log.fatalError('Something REALLY bad happened and we will exit now...')
log('Bye?') // we never got to see your goodbyes though :'(
```

### And if you're not:
```javascript
import {setLoggers} from 'jlc-logger'

setLoggers({
  // enable the default debug logger:
  debug: true,
  // log all fatal errors directly to this file:
  fatalError: './dammit.log',
  // use a script to log non-deadly errors:
  error: './errorLogger.mjs',
  // disable this because warnings are for the weak?:
  warn: false,
  // have some fun with the end user
  log: message => console.log(message.repeat(10))
}) 
```

### Or if you're a special module which output we want to differentiate from the rest of the logged messages:
```javascript
import {prefixedLog} from 'jlc-logger'

const log = prefixedLog('Special module:')
log.warn('I have special needs!')
```

### And let's end with an example showing you how to affect the output of every logger implemented:
```javascript
import {setLoggers} from 'jlc-logger'

setLoggers({
  messageConstructor: (loggerTitle, ...valuesToLog) => {
    return '🚂🚃🚃🚃🚃'+valuesToLog.join('-') // train-case-for-the-win
  }
})
```

### And a more serious variant of it where we prefix it with a datetime and a clovn face:
```javascript
import {setLoggers, defaultMessageConstructor} from 'jlc-logger'

setLoggers({
  messageConstructor: (loggerTitle, ...valuesToLog) => {
    return (new Date()).toISOString()+'🤡 '+
      defaultMessageConstructor(loggerTitle, ...valuesToLog)
  }
})
```

## Todo (or not):
- [x] Nothing that I can think of right now...

## Funding (I desperately need it):

It's up to you of course, but if you want to reward my efforts and support my path towards a better life (being able to do what I love) then please [donate to me](https://joakimch.github.io/funding.html) whichever amounts you can safely afford ~~without loosing your house~~. I'm happy even if it's just 1 ~~million~~ dollar! [Click here to learn more about my health/life situation if interested.](https://joakimch.github.io/my_story.html)

## WARNING (please read):

### This is a one-man project put here mostly to serve myself, not the public. Hence there might be bugs, ~~elephants,~~ missing or incomplete features. And I might not care about "industry standards", your meanings or doing things in any other way than MY way. But I try to follow [Semantic Versioning](https://semver.org/) at least!

### But I do believe that this project will be useful to others, so rest assured that I will not remove it. Feel free to use it and spread the word about it, but never expect anything from me!

If you read this far then thanks for your effort by the way! And I hope to see you again! 🙂 ~~And yes, I dream about being a comedian...~~
