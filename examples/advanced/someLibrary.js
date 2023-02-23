
import {log} from 'jlc-logger'

// statements executed here are part of the module's "global code"
log('log: Hi from library!')

export function outputSomethingWithTheImplementedLogger() {
  log('log: Hi from library function!')
  log.debug('debug: You might see this or not...')
  log.verbose('verbose: Yo yo yo!')
}
