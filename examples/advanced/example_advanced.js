/*
Advanced jlc-logger example
Lot's of comments here, so it's a little messy...
But reading them will help you understand more of the ways you can use jlc-logger! Also check out the basic example!
*/
import {log, setLoggers} from 'jlc-logger'
import * as lib from './someLibrary.js' // just to show how our loggers will work together with other modules

/* setLoggers returns a promise if importing external logger scripts, if you don't wait for it then they might not be ready to log anything immediately */
await setLoggers({
  /*messageConstructor: (logger, ...values) => { // optionally set a new message constructor to be used by every logger
    return (new Date()).toISOString()+': '+values.join(',')
  },*/
  // the logger functions defined below will get the message created with the messageConstructor defined above (or if not the default messageConstructor)
  log: msg => console.log(msg), // can be called like: log(message)
  // you can define any name for the loggers you implement, names other than log can be called like this: log.name(message)
  debug: false, // a true will set it to the default logger (console.debug)
  //debug: msg => console.debug(msg), // of course you can implement it yourself as well
  verbose: './verboseLogger.js', // use an external script (ES module) to handle logging through the function defined as its default export
  toLogFile: './log.txt', // log directly to a file (appended at the end)
  error(msg) { // btw; this definition is an alternative to: error: msg => {}
    // write to a log-file or whatever, it's up to you! ;)
    console.error(msg)
  },
  whateverYouWant: msg => console.log(msg), // you can use any name for your loggers, but I recommend sticking to names like: log, verbose, warn, error and debug (so other modules can always depend on those)
  toLogFileV2: {
    directory: 'log', // stored as timestamp + name of logger, e.g. 2020-10-21-verbose.log
    timestamp: true, // prefix with timestamp (on by default)
    rotation: 'daily', // weekly, monthly, yearly
    keepOld: 1,
    compressOld: true, // gzip
    copyToStdout: true,
  }
})
log.toLogFileV2('Hello advanced file logger!')
log('log: First?')
log.verbose('verbose: 1')
log.verbose('verbose: 2')
log.verbose('verbose: 3')
log.toLogFile('Hello world!')
log.notImplemented('This will not cause any errors')
if (typeof lib != 'undefined') {
  lib.outputSomethingWithTheImplementedLogger()
} else {
  const lib = await import('./someLibrary.js') // comment away 'import * as lib' to try this
  lib.outputSomethingWithTheImplementedLogger()
}
const values = ['Yo', 123, {a: 1, b: 2}] // some test values
log('log:', ...values)
log.debug('debug:', ...values)
log.whateverYouWant('whateverYouWant: Whatever floats your boat...')
log.error('error: OMG!')
delete log.exit // you can't...
log.exit('Bye!')
log('log: Not going to be logged because log.exit will call process.exit')
