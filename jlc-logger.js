/*
What you see below is full of wonderful!
*/
import {inspect} from 'util' // for detailed logging of objects, arrays and whatever
// import {createWriteStream} from 'fs'
import * as fs from 'fs'
import {isAbsolute, extname, dirname, sep as pathSep} from 'path'
let chalk; //try {chalk = require('chalk')} catch {}
try {chalk = (await import('chalk')).default} catch {} // optional dependency (for colors)
let debugBackgroundToggle = 0 // state of debug background
let logFileInfoMap = new Map() // where we keep track of file descriptors so we can close them

function newEmptyFunction() { // get a fresh one with no keys assigned to it
  return function emptyFunction() {}
}

// function getTimestamp() {return (new Date()).toISOString()}

/** The default message constructor should you want to use it for some weird reason.
 * @param {string} logger Title of the logger the message is constructed for.
 * @param  {...any} values The values to convert into a string suitable for logging.
 * @returns {string} The constructed message.
 */
export function defaultMessageConstructor(logger, ...values) {
  //let result = // prefix with the current UTC datetime
  //  (new Date()).toISOString()+':'
  let message = ''
  for (const value of values) {
    if (message) message += ' '
    if (typeof value == 'object') {
      message += inspect(value, {
        depth: Infinity,
        maxArrayLength: Infinity,
        colors: true,
        compact: false,
        breakLength: Infinity
      })
    } else {
      message += value
    }
  }
  return message
}

let messageConstructor = defaultMessageConstructor // the default one if you don't replace it

class Logger extends Function { // extends Function so we can call it like one
  constructor() {
    super()
    this.__call__ = newEmptyFunction()
  }
  exit(...values) { // the proxied version will call process.exit afterwards
    console.log(messageConstructor('exit', ...values))
  }
  fatalError(...values) { // the proxied version will call process.exit afterwards
    const msg = messageConstructor('fatalError', ...values)
    console.error(chalk ? chalk.white.bgRed(msg) : msg)
  }
}
const logInstance = new Logger() // original logger instance (not proxied)

/** The function/object which can be used across different modules to log stuff using either the default logger functions or custom functions implemented with `setLoggers`.
 * @example
 * import {log} from 'jlc-logger'
 * log('Hello')
 * log.debug('This is magic') // setLoggers() is responsible for enabling or disabling debug messages across all modules using log
 */
export const log = new Proxy(logInstance, { // Proxy allows some neat stuff
  apply(target, thisArg, args) { // trap for a function call
    return target.__call__.call(thisArg, ...args) // target.__call__(...args)
  },
  // the function below will allow functions not defined to be called without errors
  get(target, key) { // trap for getting property
    //return key in target ? target[key] : emptyFunction
    switch (key) {
      case 'fatalError':
      case 'exit':
        return (...args) => {
          if (key in target) target[key](...args)
          if (key == 'fatalError') process.exitCode = process.exitCode || 1
          process.exit()
        }
      default: return key in target ? target[key] : newEmptyFunction()
    }
  }
})

/** Get a prefixed version of `log`.
 * @param {string} prefix The prefix you want messages to start with.
 * @example
 * import {prefixedLog} from 'jlc-logger'
 * const log = prefixedLog('Some module:')
 * log('Hi')
 * log.verbose('and hello from some module')
 */
export function prefixedLog(prefix) { // returns a proxy which prefixes the loggers
  return new Proxy(logInstance, {
    apply(target, thisArg, args) { // trap for a function call
      return target.__call__.call(thisArg, prefix, ...args) 
    },
    get(target, key) { // trap for getting property
      switch (key) {
        case 'fatalError':
        case 'exit':
          return (...args) => {
            if (key in target) target[key](prefix, ...args)
            if (key == 'fatalError') process.exitCode = process.exitCode || 1
            process.exit()
          }
        default:
          // the line commented away will create a new function each time
          //return key in target ? (...args) => target[key](prefix, ...args) : emptyFunction
          // below it doesn't create a new function at each call (instead it will cache them), I hope this will be more efficient...
          if (key in target) {
            if (!target[key].prefixed?.[prefix]) { // no prefixed function stored
              if (!target[key].prefixed) target[key].prefixed = {}
              return target[key].prefixed[prefix] = (...args) => target[key](prefix, ...args)
            }
            return target[key].prefixed[prefix] // return the prefixed function
          } else {
            return newEmptyFunction()
          }
      }
    }
  })
}

/** The function used to enable or disable your logging functions as well as defining new ones.
 * @param {object} loggers An object with key names referring to the logger functions usable under the `log` import. Setting a key to `true` will enable a default logger function under that name. E.g.: `{debug: true}` will allow you to use `log.debug()`, setting it to `false` will disable it but still allow you to call it without errors. To change the `log()` function itself you can use `{log: whatever}` and then `log()` will do whatever you want. Any module which can use `setLoggers` can disable default ones like `log()`, `log.verbose()`, `log.debug()`, `log.error()` etc to suppress the output of such messages. But they can NOT disable `log.exit()` and `log.fatalError()` from causing the program to end after being used, hence you can always depend on those to shutdown the process whenever you use them.
 * @return {Promise} returns a `Promise` if importing external logger scripts (if you don't wait for it then they might not be ready to log anything immediately).
 * @example
 * import {log, setLoggers} from 'jlc-logger'
 * setLoggers({
 *   log: './logger.mjs', // log using an external JS module (ECMAScript module)
 *   verbose: './logger.mjs', // its default export should be a function like this: (loggerTitle, message) => {}
 *   debug: msg => console.debug('DEBUG MESSAGE: '+msg), // implement a custom logger function
 *   error: './error.log', // log to a file (file created if it doesn't exist)
 *   warn: false // disable the default log.warn() function
 * })
 * log('This is wonderful!')
 * log.warn('Full of wonderful!')
 */
export function setLoggers(loggers) { // can be called several times to change the loggers at runtime btw
  if (loggers == undefined) { // enable a default set
    loggers = {
      log: true, 
      verbose: process.env.NODE_ENV == 'production' ? false : true,
      warn: true,
      error: true,
      //fatalError: true, // can't be disabled, always enabled
      //exit: true,       // can't be disabled, always enabled
      groupStart: true, // used for indentation
      groupEnd: true,
    }
  }
  const extLoggerImportPromises = []
  for (let [title, value] of Object.entries(loggers)) {
    let logger
    switch (title) {
      case 'log': logger = '__call__'; break
      default: logger = title
    }
    // if setting a new function and the previous one was a jlcLogger_fileWriter function
    if (value !== true && log[logger].name == 'jlcLogger_fileWriter') {
      // then we must close the fd if it's not used by other loggers
      const logFileInfo = log[logger].logFileInfo
      logFileInfo.numLoggersUsingIt -- // subtract ourselves from this count (since we might be set to something different this time)
      if (logFileInfo.numLoggersUsingIt == 0) {
        fs.closeSync(logFileInfo.fileDescriptor)
        logFileInfo.fileDescriptor = undefined
        if (logFileInfo.intervalTimer instanceof Timeout) {
          clearInterval(logFileInfo.intervalTimer)
          logFileInfo.intervalTimer = undefined
        }
      }
    }
    switch (typeof value) {
      case 'function': {
        switch (title) {
          case 'messageConstructor': messageConstructor = value; break
          default: log[logger] = (...values) => {
            value(messageConstructor(title, ...values))
          }
        }
      } break
      case 'boolean': {
        if (value) { // if true then use a simple default logging function or enable the previously used function
          if (log[logger].name != 'emptyFunction') // if already set to a function then "true" should not do anything
            break // (skip code below)
          if (log[logger].previous) { // if there was a previous function registered
            log[logger] = log[logger].previous // then turn it back on
            if (log[logger].name == 'jlcLogger_fileWriter') { // if the previous one was a jlcLogger_fileWriter function
              const logFileInfo = log[logger].logFileInfo
              if (logFileInfo.numLoggersUsingIt == 0) { // and no more functions are using it
                logFileInfo.fileDescriptor = fs.openSync(logFileInfo.filePath) // then fd was closed and we must get a new one
                logFileInfo.numLoggersUsingIt ++
                if (logFileInfo.intervalFunction) { // restart the interval timer
                  logFileInfo.intervalTimer = setInterval(
                    logFileInfo.intervalFunction, 
                    secondsBetweenDates(new Date(), startOfNext(logFileInfo.rotationInterval))*1000
                  )
                  logFileInfo.intervalTimer.unref()
                }
              }
            }
            break // (skip code below)
          }
          switch (title) {
            case 'log':     log[logger] = (...values) => console.log(messageConstructor(title, ...values)); break
            case 'verbose': log[logger] = (...values) => console.info(messageConstructor(title, ...values)); break
            case 'debug': log[logger] = (...values) => {
              const msg = messageConstructor(title, ...values)
              debugBackgroundToggle = !debugBackgroundToggle // for those who like to debug lots of text... ;)
              if (debugBackgroundToggle)
                console.debug(chalk ? chalk.red.bgWhite(msg) : msg)
              else {
                const bn = 180
                console.debug(chalk ? chalk.red.bgRgb(bn, bn, bn)(msg) : msg)
              }
            }; break
            case 'warn': log[logger] = (...values) => {
              const msg = messageConstructor(title, ...values)
              console.warn(chalk ? chalk.red.bgYellow(msg) : msg)
            }; break
            case 'error': log[logger] = (...values) => {
              const msg = messageConstructor(title, ...values)
              console.error(chalk ? chalk.white.bgRed(msg) : msg)
            }; break
            case 'groupStart': log[logger] = (...values) => console.group(...values); break
            case 'groupEnd':   log[logger] = () => console.groupEnd(); break
            case 'fatalError': delete log[logger]; break
            default: log[logger] = (...values) => console.log(messageConstructor(title, ...values))
          }
        } else { // else allow it to be used; but the call will be to an empty function
          if (log[logger].name != 'emptyFunction') {
            const previous = log[logger] // store the previosly set function
            log[logger] = newEmptyFunction()
            log[logger].previous = previous
          }
        }
      } break
      case 'string': {
        let filePath = value
        if (!isAbsolute(value)) {
          filePath = dirname(process.argv[1])+pathSep+value
        }
        switch (extname(filePath)) {
          case '.js': case '.mjs': // if a javascript then the default export is the function used for logging
            let logQueue = [] // queue log entries logged before the module is ready
            log[logger] = (...values) => logQueue.push(messageConstructor(title, ...values))
            extLoggerImportPromises.push(new Promise((resolve, reject) => {
              import(filePath).then(module => {
                for (const entry of logQueue) module.default(title, entry)
                logQueue = undefined
                log[logger] = (...values) => module.default(title, messageConstructor(title, ...values))
                resolve()
              }).catch(reject)
            }))
          break
          default: // if any other file type then append the log to that file
            // note: we don't use fs.createWriteStream because there is no way to flush it at process.exit
            let logFileInfo = logFileInfoMap.get(filePath)
            if (logFileInfo == undefined) {
              const fileDescriptor = fs.openSync(filePath, 'a') // "Open file for appending. The file is created if it does not exist"
              logFileInfo = {
                filePath,
                fileDescriptor,
                numLoggersUsingIt: 1
              }
              logFileInfoMap.set(filePath, logFileInfo)
            } else {
              logFileInfo.numLoggersUsingIt ++ // when no more users we close the fd
            }
            log[logger] = function jlcLogger_fileWriter(...values) {
              // note that logFileInfo is a reference to an object and that changes to the fileDescriptor in it will not cause an error in the following function call (as long as the fd is open):
              fs.writeSync(logFileInfo.fileDescriptor, (new Date()).toISOString()+': '+messageConstructor(title, ...values)+'\n')
            }
            log[logger].logFileInfo = logFileInfo
        }
      } break
      case 'object': {
        let directory = value.directory
        const {
          //directory, // stored as timestamp + name of logger, e.g. 2020-10-21-verbose.log
          timestamp = true, // prefix with timestamp (on by default)
          rotation = 'daily', // weekly, monthly, yearly
          keepOld = 1,
          compressOld = true, // gzip
          copyToStdout = false,
        } = value
        if (typeof directory != 'string') throw Error('Invalid logger configuration: '+defaultMessageConstructor('', value))
        if (!isAbsolute(directory)) {
          directory = dirname(process.argv[1])+pathSep+directory
        }
        if (!directory.endsWith(pathSep)) directory += pathSep
        try {
          fs.mkdirSync(directory, {recursive: true})
        } catch (error) {throw error}
        const filePath = directory+dateISO8601()+'-'+title+'.log'
        let logFileInfo = logFileInfoMap.get(filePath)
        if (logFileInfo == undefined) {
          const fileDescriptor = fs.openSync(filePath, 'a')
          logFileInfo = {
            filePath,
            fileDescriptor,
            numLoggersUsingIt: 1
          }
          logFileInfoMap.set(filePath, logFileInfo)
        } else {
          logFileInfo.numLoggersUsingIt ++
        }
        if (rotation && !logFileInfo.intervalTimer) {
          logFileInfo.rotationInterval = rotation
          logFileInfo.intervalFunction = () => {
            const filePath = directory+dateISO8601()+'-'+title+'.log'
            /* if (logFileInfo.fileDescriptor >= 0)  */
            fs.closeSync(logFileInfo.fileDescriptor)
            logFileInfo.fileDescriptor = fs.openSync(filePath, 'a') // replace with new
            //todo: delete &or compress old logs
          }
          logFileInfo.intervalTimer = setInterval(
            logFileInfo.intervalFunction, 
            secondsBetweenDates(new Date(), startOfNext(logFileInfo.rotationInterval))*1000
          )
          logFileInfo.intervalTimer.unref() // so Node.js can quit whenever
        }
        log[logger] = function jlcLogger_fileWriter(...values) {
          const logEntry = (timestamp ? dateISO8601(new Date(), true)+': ' : '')+messageConstructor(title, ...values)
          fs.writeSync(logFileInfo.fileDescriptor, logEntry+'\n')
          if (copyToStdout) console.log(logEntry)
        }
        log[logger].logFileInfo = logFileInfo
      } break
      default: throw Error(messageConstructor(null, 'Type "'+typeof value+'" can not be used to configure a logger, please fix the "'+title+'" logger entry.'))
    }
  }
  // return a promise that will wait for any external loggers defined to be ready to log messages
  return Promise.all(extLoggerImportPromises)
}

setLoggers() // always enable the default ones



function secondsBetweenDates(fromDate, toDate) {
  return Math.round(toDate.getTime()/1000 - fromDate.getTime()/1000)
}

function dateToObj(date) {
  return {
    year: date.getFullYear(),
    month: (date.getMonth()+1), 
    day: date.getDate()
  }
}
function dateFromObj(obj) {
  return new Date([obj.year, obj.month, obj.day].join('-'))
}

function startOfNext(period, fromDate, mondayIsFirstDayOfWeek=true) {
  fromDate = fromDate || new Date()
  const dateObj = dateToObj(fromDate)
  switch (period) { // 'daily', // weekly, monthly, yearly
    case 'day': case 'daily':
      dateObj.day ++
    break
    case 'week': case 'weekly': {
      let dayIndex = fromDate.getDay()
      if (mondayIsFirstDayOfWeek) {
        dayIndex -= 1
        if (dayIndex == -1) dayIndex = 6
      }
      const daysLeft = 6 - dayIndex +1
      dateObj.day += daysLeft
      const daysInThatMonth = daysInMonth(fromDate)
      if (dateObj.day > daysInThatMonth) {
        dateObj.day = dateObj.day - daysInThatMonth
        dateObj.month ++
      }
    } break
    case 'month': case 'monthly': {
      dateObj.day = 1
      dateObj.month ++
    } break
    case 'year': case 'yearly': {
      dateObj.day = 1
      dateObj.month = 1
      dateObj.year ++
    }; break
    default:
      throw Error('Unknown period (if UPPER-CASE then try lower-case): '+period)
  }
  if (dateObj.month > 12) {
    dateObj.month = 1
    dateObj.year ++
  }
  return dateFromObj(dateObj)
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth()+1, 0).getDate()
}

function dateISO8601(date, withTime) {
  const prefix = string => '0'.repeat(2-(''+string).length)+string
  if (!date) date = new Date()
  if (!withTime)
    return date.getFullYear()+'-'+prefix(date.getMonth()+1)+'-'+prefix(date.getDate())
  return date.getFullYear()+'-'+prefix(date.getMonth()+1)+'-'+prefix(date.getDate())
    +'T'+prefix(date.getHours())+':'+prefix(date.getMinutes())+':'+prefix(date.getSeconds())
}
