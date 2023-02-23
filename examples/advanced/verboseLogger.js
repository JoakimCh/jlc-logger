
import * as fs from 'fs'
import {fileURLToPath} from 'url'
import {dirname, sep as pathSep} from 'path'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))+pathSep // process.argv[1] and process.cwd() are also useful depending on your needs
const fd = fs.openSync(scriptDirectory+'verbose.txt', 'a')

export default function (logger, message) {
  switch (logger) {
    case 'verbose':
      console.log(message) // optional of course
      fs.writeSync(fd, message+'\n')
    break
  }
}
