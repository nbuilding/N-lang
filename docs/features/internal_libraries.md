# Internal Libraries

```js
import fek // import imports an internal library as a special record of the same name into the program
// fek.paer("hi") deprecated, as the fek library was a test that was left in by accident

import FileIO // Used for File input and output
FileIO.write("test.txt", "test")! // This overwrites everything inside the test.txt file, it also creates a new file if it does not exist, returns a cmd
FileIO.append("test.txt", "test")! // This adds to the data that already exists in text.txt, it also creates a new file if it does not exist, returns a cmd
FileIO.read("test.txt")! |> default("") // This returns a maybe[str] in case the file does not exist, returns a cmd

import json // JSON enum and related functions, mostly used for request
let value:json.value = json.object(mapFrom([ // This is a map[str, json.value]
	("test", json.string("test")) // There are json.string, json.array, json.number, and json.none
]))
print(json.stringify(value)) // Turns a json.value into a string
print(json.parse("{ \"test\": \"test\" }")) // Turns a string into a json.value, if it fails it will return a json.none
print(json.parseSafe("{ \"test\": \"test\" }") |> default(json.string("invalid"))) // Turns a string into a maybe[json.value]

import request // Used for http requests for websites
request.get("https://github.com", mapfrom([("","")]))! // Takes in a url and a header and returns a {code: int, response: str, return: json.value}, returns a cmd
request.post("https://github.com", mapFrom(["hello", "hello"]), mapfrom([("","")]))! // Takes in a url, content, and a header and returns a {code: int, response: str, text: str}, returns a cmd

import SystemIO // Used for System input output with the console
print("You said: " + SystemIO.imp("hello! ")!) // Prints the prompt then takes in the value after an enter is pressed and returns it. Returns a cmd

import times // Used for pausing execution
// times.sleep(1000)! // Takes in a time in milliseconds and pauses execution for that long, deprecated as there is a bug that will always occur with this

import websocket // Used for connecting to WebSockets
let websocketTest = websocket.connect({
  onOpen: [send: websocket.send] -> cmd[bool] {
    print("Open!")
    let _ = send("hi")!
    return false
  },
  onMessage: [send: websocket.send message: str] -> cmd[bool] {
    print(message)
    let _ = send("hello")!
    return message == "hello"
  }
}, "wss://echo.websocket.org")! // This takes in a record of an onOpen function, which runs when the websocket is opened, and an onMessage function, which runs when there is a message, returns a cmd
// Both functions return a boolean for whether to stop (true) or continue (false)
// websocket.send is a function that is one of the arguments in both of the functions that is a function to send data to the WebSocket that it is connected to
```

## Notes
- All of these are written in python.
- Later there may be a way to write your own, but this is unlikely.
- The imported libraries are not records, but record-like.