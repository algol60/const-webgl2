# WebGL2 demo

> **Note** : this is really rough, it's just a demo.

> - Firefox: I can display 10 million nodes, but it takes a while to get going. 20 million runs out of memory.
> - Chrome: I can display 1 million nodes, and they load noticably quicker. 10 million errors out.

The code in `example1.html` is a WebGL2 demo, to see how many nodes we can draw in a browser.

In its current state, the nodes are just drawn as-is. This is obviously insufficient: as the camera moves, the modes should move so they are always facing the camera, but this is a start. (You'll see a weird black band sweep across the screen: this is all of the nodes turning edge-on at almost the same time as the camera moves.)

There is currently no mouse interaction. Instead, the camera is updated every animation cycle. This is sufficient for now to get an idea of how the browser can cope.

## Running the demo

To see the demo, start your favourite local web server in the root directory, and browse to the server. For example:

```
python -m http.server
```

Then browse to `http://localhost:8000/example1.html` in your favourite browser.

## Adjustments

If a large number of nodes are being drawn, it takes some time to send the data to the GPU. While this happens, the window will turn red. Don't panic. If it seems to be taking a long time, use F12 to open the Developer Tools window and see if anything has gone wrong.

Adjust the number of nodes by changing `nNodes`. (Start at 100, add a zero, refresh the browser, repeat. :-)) There's a rough calculation to modify the volume that the nodes are randomly drawn in, but feel free to change `objDiam` as `nNodes` changes.

If you feel the camera is spinning too slowly or quickly, change the re-definition of `time` at the top of the `drawScene()` function.

The script uses `requestAnimationFrame(drawScene)` to redraw the scene, passing the current time to `drawScene`. The time is converted to a number that is used to move the camera.

The calculation looks something like:
```
time = time * 0.001;
```

Feel free to adjust the conversion factor up or down if you're impatient, or your head is spinning.

You can also adjust the distance of the camera from the centre of the whirlpool by modifying `camDist`. As the volume gets larger, the nodes tend to be further away, so decrease the camera distance.

# Obvious next steps

- Billboarding (nodes always face the camera).
- More complicated shaders to match Constellation.
- Add lines, blazes, etc.
- Use mouse interaction to get a better idea of how user interaction feels.
- Selection, dragging, etc.
