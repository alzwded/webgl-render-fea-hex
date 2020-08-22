WebGL -- render FEA-style HEXA displacements
============================================

**Question**: Can you move a lot of display pre-processing code for FEA results from the CPU to the GPU?

**Answer**: Yes? Anything particular in mind?

**Question**: Can you compute vertex displacement and corner-node results interpolation in a shader, while animating?

**Answer**: Yes, and with nice shading.

To make our lives easier
------------------------

Let's do away with the complexity of reading results, mapping them, a decomposing solids into faces. This program starts by having faces already computed, with normals facing outwards. It also assumes inner faces were already removed. It also assumes result-less faces were already removed.

So let's hard-code the coordinates, face connectivity, and displacements.

We'll be using WebGL2 with OpenGL ES 3.0 shaders (mostly because of the transform feedback bits)

Animation
---------

This program shows a rotating hex, with deformation being animated over like 1.2s over something like that. It renders as fast as Chrome wants it to, or as fast as it can, whichever is lower.

`main`: initializes webgl2, compiles & links program, and setups up the animation

`setup_scene`: initalizes gl buffers with the current scene data; i.e. "do you want to look at magnitude, x, y or z?"

`preproc`: does some final pre-processing, meaning it translates quad faces into triangles in a way that the processed data can be passed straight to openGL buffers. Quads are split into two triangles, and common edges have their nodes pushed twice, because the node has a different normal based on which face we're talking about. It computes magnitudes if requested, otherwise pushes the x/y/z results. It computes the global min/max to pass this info off to the shaders to normalize them. Technically, magnitude computation could also be delegated to the shaders, but I wanted to avoid IFs. IFs are bad. Oh, and I needed to properly pre-displace the corner nodes to allow the normal to be computed at all.

`loop`: call `glDrawElements` and let the shaders take over

`vShader`: normalize corner node results, apply displacement to vertex scaled by the animation frame, compute face normal based on the displaced vertices at this frame, and compute ambient and diffuse lighting

`fShader`: interpolate corner results over the whole face to compute color, and compute specular lighting to make it look more professional

Transform
---------

This program shows a rotation hex, with the ability to toggle between the deformed mesh or the undeformed mesh. Whenever the state changes, it recomputes color mapping from result to the red-green axis, normals and the position of the vertex after displacement.

This allows us to compute displacements and normals once per state change (yay, caches!), and then re-use it. For animations, it could use the transform shader to render like 30 intermediate states, and then re-use the 30ish states later when animating in a loop.

`main`: initializes webgl2, compiles & links programs, and setups up the animation

`setup_scene`: initalizes gl buffers with the current scene data; i.e. "do you want to look at magnitude, x, y or z?". Passes control over to `render`


`preproc`: does some final pre-processing, meaning it translates quad faces into triangles in a way that the processed data can be passed straight to openGL buffers. Quads are split into two triangles, and common edges have their nodes pushed twice, because the node has a different normal based on which face we're talking about. It computes magnitudes if requested, otherwise pushes the x/y/z results. It computes the global min/max to pass this info off to the shaders to normalize them. Technically, magnitude computation could also be delegated to the shaders, but I wanted to avoid IFs. IFs are bad. Oh, and I needed to properly pre-displace the corner nodes to allow the normal to be computed at all.

`render`: It sets up a transform feedback pipeline with the nodal coordinates, displacement, 3 other corner node coordinates, and corner node results, + deformation scaling and global min/max; it then reads back the displaced coordinates, face normals per vertex, and normalized colors. It then passes control over to the main render `loop`

`loop`: sets up the render shader program with displaced vertex coordinates, face normals, normalized corner results, view matrix and texture coordinates, and runs it. This draws the pretty picture

`vTransform`: vertex shader that computes the displaced vertex location, face normal, and normalized color mapping from corner-node results to our red-green color scale

`fTransform`: NOOP, needed to link the program

`vRender`: apply view transformation, compute the normal relative to the current view, and compute ambient & diffuse lighting

`fRender`: interpolate corner results over the whole face to compute color, and compute specular lighting to make it look more professional

Conclusions
-----------

**Q**: Were you successful?

**A**: Yeah, I think. I'd take the transform pipeline a bit further and split off the coordinate displacement calculation and result-to-color mapping because I still kinda copped and *did* compute deformations (redundantly) on the CPU, in order to pass off this info to the shader so it can do nice interpolation over the quad faces. But it's like 99% there. So yeah, `#successful`.
