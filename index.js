#!/usr/bin/env node

process.title = 'lil-pids'

var fs = require('fs')
var readFile = require('read-file-live')
var respawn = require('respawn')
var chalk = require('chalk')
var bashParse = require('shell-quote').parse
var dateFormat = require('dateformat')

var BIN_SH = process.platform === 'android' ? '/system/bin/sh' : '/bin/sh'
var CMD_EXE = process.env.comspec || 'cmd.exe'

var colors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray']
var currentColor = 0
var datePattern = process.env.LIL_PIDS_FMT || 'HH:MM:ss.l'
var reloadDelay = parseInt(process.env.LIL_PIDS_DELAY) || 1000;

var servicesFile = process.argv[2]
var pidsFile = process.argv[3]

if (!servicesFile) {
  console.error('Usage: lil-pids [services-file] [pids-file?]')
  process.exit(1)
}

var services = []
var monitors = {}
var reloadTimeout

readFile(servicesFile, updateDelayed)

function writePids (cb) {
  if (!pidsFile) return

  var cmds = Object.keys(monitors).sort(function (a, b) {
    var i = services.indexOf(a)
    var j = services.indexOf(b)
    return (i === -1 || j === -1) ? a.localeCompare(b) : i - j
  })

  var lines = cmds.map(function (cmd) {
    if (!monitors[cmd].pid) return
    return monitors[cmd].pid + ' ' + cmd + '\n'
  })

  fs.writeFile(pidsFile, lines.join(''), cb || noop)
}

function updateDelayed (buf) {
  if (reloadTimeout){
    clearTimeout(reloadTimeout)
  }
  reloadTimeout = setTimeout(() => {
    update(buf)
  }, reloadDelay)
}

function update (buf) {
  var latest = parse(buf)
  var prev = services

  services = latest

  prev.forEach(function (s) {
    if (latest.indexOf(s) === -1) stop(s)
  })
  latest.forEach(function (s) {
    if (prev.indexOf(s) === -1) start(s)
  })
}

function stop (cmd) {
  monitors[cmd].stop()
  delete monitors[cmd]
}

function start (cmd) {
  var m = monitors[cmd] = spawn(cmd)
  var color = chalk[nextColor()]

  m.on('spawn', onspawn)
  m.on('exit', onexit)
  m.on('stdout', onstdout)
  m.on('stderr', onstderr)
  m.on('stop', update)

  m.start()

  function onstdout (message) {
    onlog('OUT', message)
  }

  function onstderr (message) {
    onlog('ERR', message)
  }

  function onspawn () {
    console.log(color(prefix(m.pid, 'SPAWN') + '!!!!! start ' + cmd))
    writePids()
  }

  function onexit (code) {
    console.log(color(prefix(m.pid, 'EXIT') + '!!!!! exit(' + code + ') ' + cmd))
    writePids()
  }

  function onlog (type, message) {
    var ln = message.toString().split('\n')
    if (ln[ln.length - 1] === '') ln.pop()
    for (var i = 0; i < ln.length; i++) ln[i] = prefix(m.pid, type) + ln[i]
    console.log(color(ln.join('\n')))
  }

  function update () {
    writePids()
  }
}

function parse (buf) {
  if (!buf) return []
  return buf.toString().trim().split('\n')
    .map(function (line) {
      return line.trim()
    })
    .filter(function (line) {
      return line && line[0] !== '#'
    })
}

function prefix (pid, type) {
  var spid = pid.toString()
  return dateFormat(datePattern) + ' ' + '     '.substr(spid.length) + spid + ' [' + type + ']' + '     '.substr(type.length) + ' '
}

function spawn (cmd) {
  var args = bashParse(cmd)
  if (args.every(item => typeof item === 'string')) return respawn(args, {maxRestarts: Infinity})
  if (process.platform !== 'win32') return respawn([BIN_SH, '-c', cmd], {maxRestarts: Infinity})
  return respawn([CMD_EXE, '/d', '/s', '/c', '"' + cmd + '"'], {maxRestarts: Infinity, windowsVerbatimArguments: true})
}

function nextColor () {
  if (currentColor === colors.length) currentColor = 0
  return colors[currentColor++]
}

function noop () {}
