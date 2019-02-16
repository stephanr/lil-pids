# lil-pids

Dead simple process manager with few features

```
npm install -g lil-pids
```

First create a file with the commands you wanna have running

```
# assuming this file is called 'services'
node server.js
node another-server.js
```

Then simply start lil-pids with the filename

```
lil-pids ./services
```

It'll watch the file so every time you update it, old processes
no longer referenced from the file will be shutdown and any new ones will be spawned.

Reloading the file is delayed to avoid problems that occur when the file is first deleted and then rewritten.

lil-pids will forward all stdout, stderr to its own stdout prefixed with date/time, type (out/err) and the process id.

It will also tell you when a command has been spawned, exited and finally it will restart processes
when the crash/end.

lil-pids can also write the pids of the current running processes to a file. Just pass the pids filename as the 2nd argument

```
lil-pids ./services ./pids
```

Then you can simply `cat ./pids` to see what is running at the moment.

That's it!

## Pro-tips

* Spawn `lil-pids ./services ./pids` with your OS' service monitor. Then it'll startup at boot and every thing you need to do is edit the services file.

* Add `> output.log and 2> errors.log` to the end of a command to persist logs to files.

* Cat the pids file and use `kill` to restart a running process. Use `ps` / `top` to check how something is running.

* Add `#` in front of a service to disable it temporarily.

* The reload delay of the service file can be adjusted with the environment variable `LIL_PIDS_DELAY`.

* The date format of the output can also be adjusted by the environment variable `LIL_PIDS_FMT`. 

## Start on server boot

To start lil-pids on server boot (or restart it when it crashes) you can add it using systemd.

```
npm install -g add-to-systemd
sudo $(which add-to-systemd) -u $(whoami) -e PATH=$PATH lil-pids $(which lil-pids) ./services ./pids
sudo systemctl start lil-pids
```

## License

MIT
