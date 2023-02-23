/*
Basic jlc-logger example
To enable colors run: npm install chalk
*/
import {log, setLoggers, prefixedLog} from 'jlc-logger'

setLoggers({ // make some changes to the default loggers
  debug: true, // also enable the default debug logger
  whatever: msg => console.log('Whatever: '+msg), // and implement a whatever logger
  fatalError: msg => console.log('fatalError: '+msg) // you can customize it, but not stop it from exiting the program
}) 

log('Log', {anything: 'really!'})
log.verbose('Verbose') // depends on process.env.NODE_ENV not being set to 'production', unless you enable it manually in setLoggers()
log.whatever(1)
log.debug('Debug', {
  any: 'interesting',
  stuff: ':)'
})
log.warn('Warning')
log.fkhsdkfsdsfja('I guess it is not implemented?') // it will not cause an error though
const logPrefixed = prefixedLog('My prefix:') // get a prefixed version of our logger
logPrefixed('Isn\'t that cool?')
logPrefixed.debug('Yeah, I know...')
setLoggers({debug: false, whatever: false}) // turn off debug and the whatever we defined
log.whatever(2) // then this is not logged
setLoggers({whatever: true}) // turn whatever back on (it will remember its previous function)
log.whatever(3)
log.debug('Debug is not enabled anymore') // so you will not see this
setLoggers({ // the messageConstructor feeding all the loggers can be changed
  messageConstructor: (logger, ...values) => values.join('-') // let's make it more stupid...
})
log('🚂', '🚃', '🚃', 'Train', 'case', 'is', 'cool?', {or: 'not'})
log.error('Error (for testing that is, nobody got hurt)')
delete log.fatalError // you can't, hence modules can always depend on it (and log.exit), but you deleted your custom variant of it though
log.fatalError('And an unforgivable error which forces Node.js to exit immediately') // the end user probably likes these better than thrown errors
log('Hence you will not see this :P')

// Please mess around with this example to see what happens with the output :) Then move on to the advanced example to explore more advanced usage.