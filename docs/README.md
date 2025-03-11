# WebGL2 demo

> **Note** : this is really rough, it's just a demo.

> - Firefox: I can display 10 million nodes, but it takes a while to get going. 20 million runs out of memory.
> - Chrome: I can display 1 million nodes, and they load noticably quicker. 10 million errors out.

The code in `index.html` is a WebGL2 demo, to see how many nodes we can draw in a browser.

## Running the demo

To see the demo, start your favourite local web server in the root directory, and browse to the server. For example:

```
python -m http.server
```

* Left button rotates the graph. Note that the nodes always face the camera.
* Mouse wheel zooms to the cursor; use Ctrl to slow the zoom down.

Then browse to `http://localhost:8000/example1.html` in your favourite browser.

## Adjustments

If a large number of nodes are being drawn, it takes some time to send the data to the GPU. While this happens, the window will turn red. Don't panic. If it seems to be taking a long time, use F12 to open the Developer Tools window and see if anything has gone wrong. Having said that, we're now using instancing, so even a million nodes + transactions doesn't take long.

Adjust the number of nodes by changing `nNodes` in `main.js`. (Start at 100, add a zero, refresh the browser, repeat. :-)) The demo graph is a straight steal from Constellation's sphere graph.

You can also adjust the distance of the camera from the centre of the whirlpool by modifying `camDist`. As the volume gets larger, the nodes tend to be further away, so decrease the camera distance. Hopefully not necessary, this is also a straight steal from Constellation.

Mouse wheel zooming works (ish) - I've copied Constellation's algorithm (I feel I can do this), but it really needs proper rotating + panning + zooming all integrated.

To see how well it animates (and notice that the nodes are always facing the front), set const spin to `true`. (This demonstrates that zooming is broken.)
If you feel the camera is spinning too slowly or quickly, change the re-definition of `time` at the top of the `drawScene()` function. The calculation looks something like:
```
time = time * 0.001;
```

## Notes

- Instead of sending icon texture coordinates for up to six different icons per node (foreground, background, four decorators), send a single 0..1 set of coordinates and the icon index, and let the fragment shader calculate the cooordinates from the index and the known size of the texture atlas.

# Obvious next steps

- More complicated shaders to match Constellation.
- Add line distance from nodes, arrowheads on lines, blazes, etc.
- Better (consistent) mouse interaction. Move the camera, or use a model matrix?
- Selection, dragging, etc.
