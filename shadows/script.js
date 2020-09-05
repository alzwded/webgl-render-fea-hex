// app state: which component gets plotted
var state = {
    component: 3,
    deformation: true,
    animframe: 0,
    next: undefined,
    render: undefined,
    colorAxisType: 1,
    renderDepth: false

}

const camera = {
    matrix: undefined,
    viewMatrix: undefined,
    mvpMatrix: undefined
}
// nodes
var nodes = [
    // base
    /*  0 */ -10.0, 0.0, -10.0,
    /*  1 */ 10.0, 0.0, -10.0,
    /*  2 */ 10.0, 0.0, 10.0,
    /*  3 */ -10.0, 0.0, 10.0,
    // cube1
    // - base
    /*  4 */ -7.0, 0.0, -2.0,
    /*  5 */ -3.0, 0.0, -2.0,
    /*  6 */ -3.0, 0.0, 2.0,
    /*  7 */ -7.0, 0.0, 2.0,
    // - top
    /*  8 */ -7.0, 4.0, -2.0,
    /*  9 */ -3.0, 4.0, -2.0,
    /* 10 */ -3.0, 4.0, 2.0,
    /* 11 */ -7.0, 4.0, 2.0,
    // cube2
    // - base
    /* 12 */ 3.0, 0.0, -2.0,
    /* 13 */ 7.0, 0.0, -2.0,
    /* 14 */ 7.0, 0.0, 2.0,
    /* 15 */ 3.0, 0.0, 2.0,
    // - top
    /* 16 */ 3.0, 4.0, -2.0,
    /* 17 */ 7.0, 4.0, -2.0,
    /* 18 */ 7.0, 4.0, 2.0,
    /* 19 */ 3.0, 4.0, 2.0,
    // - fake bottom // excellent map design there
    /* 20 */ -14.1, -1.0, -14.1,
    /* 21 */ 14.1, -1.0, -14.1,
    /* 22 */ 14.1, -1.0, 14.1,
    /* 23 */ -14.1, -1.0, 14.1,
]

var quads = [
    // base
    [0, 1, 2, 3],
    [20, 23, 22, 21],
    // cube1
    [4+3, 4+2, 4+1, 4+0],
    [4+4, 4+5, 4+6, 4+7],
    [4+0, 4+1, 4+5, 4+4],
    [4+1, 4+2, 4+6, 4+5],
    [4+2, 4+3, 4+7, 4+6],
    [4+3, 4+0, 4+4, 4+7],
    // cube2
    [12+3, 12+2, 12+1, 12+0],
    [12+4, 12+5, 12+6, 12+7],
    [12+0, 12+1, 12+5, 12+4],
    [12+1, 12+2, 12+6, 12+5],
    [12+2, 12+3, 12+7, 12+6],
    [12+3, 12+0, 12+4, 12+7],
]

var colors = [
    // base
    [0.2, 0.6, 0.2, 1.0],
    // cube1
    [0.7, 0.7, 0.2, 1.0],
    [0.7, 0.7, 0.2, 1.0],
    [0.7, 0.7, 0.2, 1.0],
    [0.7, 0.7, 0.2, 1.0],
    [0.7, 0.7, 0.2, 1.0],
    [0.7, 0.7, 0.2, 1.0],
    // cube2
    [0.2, 0.7, 0.7, 1.0],
    [0.2, 0.7, 0.7, 1.0],
    [0.2, 0.7, 0.7, 1.0],
    [0.2, 0.7, 0.7, 1.0],
    [0.2, 0.7, 0.7, 1.0],
    [0.2, 0.7, 0.7, 1.0],
    // ignored
    [0.2, 0.6, 0.2, 1.0],
]


// preproc high-level face-based geometry to openGL triangles, vectors, texcoords
function preproc()
{
    // nodal coordinates as passed to opengl
    let coords = []
    // 3 corner nodes of a face to compute the face normal in the shader
    let As = []
    let Bs = []
    let Cs = []
    // triangles as passed to open gl
    let trias = []
    // global min/max to normalize result amplitudes
    let min = 0.0
    let max = 0.0
    // texture coordinates to properly map results per face
    let texcoords = []
    // all four corner nodes to compute the texture mapping
    let myColors = []

    // for each quad
    for(let i = 0; i < quads.length; ++i) {
        let quad = quads[i]
        // triangulate
        trias.push(4 * i + 0, 4 * i + 1, 4 * i + 2, 4 * i + 0, 4 * i + 2, 4 * i + 3)
        // set texture coordinates
        texcoords.push(
            0.0, 0.0,
            0.0, 1.0,
            1.0, 1.0,
            1.0, 0.0
        )
        // push colors
        myColors.push(
            ...colors[i],
            ...colors[i],
            ...colors[i],
            ...colors[i])
        // push coordinates
        coords.push(
            nodes[3 * quad[0] + 0],
            nodes[3 * quad[0] + 1],
            nodes[3 * quad[0] + 2],
            nodes[3 * quad[1] + 0],
            nodes[3 * quad[1] + 1],
            nodes[3 * quad[1] + 2],
            nodes[3 * quad[2] + 0],
            nodes[3 * quad[2] + 1],
            nodes[3 * quad[2] + 2],
            nodes[3 * quad[3] + 0],
            nodes[3 * quad[3] + 1],
            nodes[3 * quad[3] + 2])
        // push A,B and C corner nodes to compute the face normal
        As.push(
            nodes[3 * quad[0] + 0],
            nodes[3 * quad[0] + 1],
            nodes[3 * quad[0] + 2],
            nodes[3 * quad[0] + 0],
            nodes[3 * quad[0] + 1],
            nodes[3 * quad[0] + 2],
            nodes[3 * quad[0] + 0],
            nodes[3 * quad[0] + 1],
            nodes[3 * quad[0] + 2],
            nodes[3 * quad[0] + 0],
            nodes[3 * quad[0] + 1],
            nodes[3 * quad[0] + 2])
        Bs.push(
            nodes[3 * quad[1] + 0],
            nodes[3 * quad[1] + 1],
            nodes[3 * quad[1] + 2],
            nodes[3 * quad[1] + 0],
            nodes[3 * quad[1] + 1],
            nodes[3 * quad[1] + 2],
            nodes[3 * quad[1] + 0],
            nodes[3 * quad[1] + 1],
            nodes[3 * quad[1] + 2],
            nodes[3 * quad[1] + 0],
            nodes[3 * quad[1] + 1],
            nodes[3 * quad[1] + 2])
        Cs.push(
            nodes[3 * quad[2] + 0],
            nodes[3 * quad[2] + 1],
            nodes[3 * quad[2] + 2],
            nodes[3 * quad[2] + 0],
            nodes[3 * quad[2] + 1],
            nodes[3 * quad[2] + 2],
            nodes[3 * quad[2] + 0],
            nodes[3 * quad[2] + 1],
            nodes[3 * quad[2] + 2],
            nodes[3 * quad[2] + 0],
            nodes[3 * quad[2] + 1],
            nodes[3 * quad[2] + 2])
    }

    return {
        coords: coords,
        trias: trias,
        As: As,
        Bs: Bs,
        Cs, Cs,
        texcoords: texcoords,
        colors: myColors
    }
}

async function setup_scene() {
    
    let gl = state.gl
    let canvas = gl.canvas

    // ===== populate buffers with scene state =====
    let prim = await preproc();

    // initialize our buffers
    let coordsBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, coordsBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.coords), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    let colorBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.colors), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    let asBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, asBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.As), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    let bsBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, bsBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.Bs), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    let csBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, csBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.Cs), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    let triaBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triaBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(prim.trias), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

    let texcoordBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(prim.texcoords), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    // ===== scene populated =====

    // ===== transform buffers =====
    let tNormalsBuffer = gl.createBuffer()
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, tNormalsBuffer)
    gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, 3 * prim.coords.length * 4, gl.STATIC_COPY)
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null)

    let mcoordslength = prim.coords.length
    let mtriaslength = prim.trias.length
    prim = undefined

    // we'll need these  in the render loop, but let's not spam openGL with requests
    const lightTexture = gl.createTexture();
    let lightFrameBuffer = gl.createFramebuffer()
    const sceneTexture = gl.createTexture()

    gl.bindTexture(gl.TEXTURE_2D, lightTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null)

    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null)

    
    const singleTriangleBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, singleTriangleBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      /* coords    texords */
        -1, -1, 0, 0, 0, // T1
         1, -1, 0, 1, 0,
         1,  1, 0, 1, 1,
        -1, -1, 0, 0, 0, // T2
         1,  1, 0, 1, 1,
        -1,  1, 0, 0, 1,
    ]), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)


    state.render = (() => {
        gl.useProgram(state.transformProgram)

        gl.bindBuffer(gl.ARRAY_BUFFER, asBuffer)
        let aA = 0
        gl.vertexAttribPointer(aA, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(aA)
    
        gl.bindBuffer(gl.ARRAY_BUFFER, bsBuffer)
        let aB = 1
        gl.vertexAttribPointer(aB, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(aB)
    
        gl.bindBuffer(gl.ARRAY_BUFFER, csBuffer)
        let aC = 2
        gl.vertexAttribPointer(aC, 3, gl.FLOAT, false, 0, 0)
        gl.enableVertexAttribArray(aC)
    

        // bind transform buffers
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, tNormalsBuffer);

        gl.enable(gl.RASTERIZER_DISCARD)
        gl.beginTransformFeedback(gl.POINTS)

        gl.drawArrays(gl.POINTS, 0, mcoordslength/3)

        gl.endTransformFeedback()
        gl.disable(gl.RASTERIZER_DISCARD)
        //gl.flush();

        // unbind transform buffers
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);


        let loop = function _loop() {
            gl.enable(gl.DEPTH_TEST)
            if(state.renderDepth) {
                canvas.width = 1024
                canvas.height = 1024
            } else {
                canvas.width = 800
                canvas.height = 600
            }

            // === compute shadow map for our one light ===
            gl.useProgram(state.lightProgram)
            gl.viewport(0, 0, 1024, 1024)
            //gl.viewport(0, 0, canvas.width, canvas.height)
 
            // Compute the matrices
            let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
            // model matrix
            //let lightMV = m4.yRotate(m4.xRotate(m4.translate(m4.identity(), 0, 0, -10 * 1.41), 45 * 360 / 2 * 3.14159), 3.14159 / 2)
            //lightMV = m4.yRotate(m4.xRotate(m4.translate(m4.identity(), 0, 0, -100 * 1.41), 45 / 360 * 2 * 3.14159), 3.14159 / 2)
            //lightMV = m4.multiply(lightMV, m4.translate(m4.identity(), 0, 0, -10 * 1.41))
            let rotations = m4.identity()
            rotations = m4.xRotate(rotations, 45 / 360 * 2 * 3.14159)
            rotations = m4.yRotate(rotations, 3.14159 / 2)
            rotations = m4.yRotate(rotations, state.animframe * 0.3/18)
            let translations = m4.identity()
            translations = m4.translate(translations, 0, 0, -10 * 1.41)
            let lightMV = m4.multiply(translations, rotations)
            let lightPos = [0, 0, -10 * 1.41, 1]
            lightPos = m4.transformVector(m4.xRotate(m4.identity(), 45 / 360 * 2 * 3.14159), lightPos)
            lightPos = m4.transformVector(m4.yRotate(m4.identity(), 3.14159 / 2), lightPos)
            lightPos = m4.transformVector(m4.yRotate(m4.identity(), state.animframe * 0.3/18), lightPos)
            lightPos = m4.transformVector(m4.inverse(rotations), [0, 0, -10 * 1.41, 1])
            // projection matrix
            let lightP = m4.perspective(3.14159/1.3, 1, 0.1, 100.0)
            // apply projection matrix to get projection-model-view matrix
            let lightMVP = m4.multiply(lightP, lightMV)

            // assign inputs
            gl.bindBuffer(gl.ARRAY_BUFFER, coordsBuffer)
            let aCoords = 0;
            gl.vertexAttribPointer(aCoords, 3, gl.FLOAT, false, 0, 0)
            gl.enableVertexAttribArray(aCoords)

            gl.bindBuffer(gl.ARRAY_BUFFER, tNormalsBuffer)
            let aShadowNormals = 1;
            gl.vertexAttribPointer(aShadowNormals, 3, gl.FLOAT, false, 0, 0)
            gl.enableVertexAttribArray(aShadowNormals)

            gl.uniformMatrix4fv(gl.getUniformLocation(state.lightProgram, "uMVP"), false, lightMVP);
            gl.uniformMatrix4fv(gl.getUniformLocation(state.lightProgram, "uMV"), false, lightMV);
            gl.uniform1f(gl.getUniformLocation(state.lightProgram, "uFarPlane"), 100.0);

            if(!state.renderDepth) {
                // create texture
                gl.activeTexture(gl.TEXTURE0)

                gl.bindFramebuffer(gl.FRAMEBUFFER, lightFrameBuffer);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, lightTexture, 0) 
            }

            gl.cullFace(gl.BACK)
            gl.enable(gl.CULL_FACE)

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triaBuffer)

            gl.clearColor(1.0, 0.0, 1.0, 0.0)
            gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT)
            gl.drawElements(gl.TRIANGLES, mtriaslength, gl.UNSIGNED_INT, 0)

            if(state.renderDepth) {
                gl.bindTexture(gl.TEXTURE_2D, null)
                requestAnimationFrame(loop)
                return
            }

            gl.cullFace(gl.FRONT)
            //gl.disable(gl.CULL_FACE)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            //requestAnimationFrame(loop);
            //return

            // === scene render pass ===
            // load program
            gl.useProgram(state.renderProgram)
            gl.viewport(0, 0, canvas.width, canvas.height)

            gl.activeTexture(gl.TEXTURE1)

            gl.bindFramebuffer(gl.FRAMEBUFFER, lightFrameBuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTexture, 0) 

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, lightTexture);
    
            // assign inputs
            gl.bindBuffer(gl.ARRAY_BUFFER, coordsBuffer)
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
            gl.enableVertexAttribArray(0)
    
            gl.bindBuffer(gl.ARRAY_BUFFER, tNormalsBuffer)
            let aNormal = 1
            gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0)
            gl.enableVertexAttribArray(aNormal)

            gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer)
            let aTexCoords = 2
            gl.vertexAttribPointer(aTexCoords, 2, gl.FLOAT, false, 0, 0)
            gl.enableVertexAttribArray(aTexCoords)

            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
            let aColor = 3
            gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0)
            gl.enableVertexAttribArray(aColor)
    
            
    
            // Set the matrix.
            gl.uniformMatrix4fv(gl.getUniformLocation(state.renderProgram, "uMatrix"), false, camera.matrix)
            gl.uniformMatrix4fv(gl.getUniformLocation(state.renderProgram, "uMVP"), false, camera.mvpMatrix)
            gl.uniform3fv(gl.getUniformLocation(state.renderProgram, "uLight"), [lightPos[0], lightPos[1], lightPos[2]])
            gl.uniformMatrix4fv(gl.getUniformLocation(state.renderProgram, "uMVPLight"), false, lightMVP)
            gl.uniform1i(gl.getUniformLocation(state.renderProgram, "uLightMap"), 0);
    
            // draw
            gl.enable(gl.DEPTH_TEST)
            gl.clearColor(0.0, 0.0, 0.0, 0.0)
            gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT)
            gl.drawElements(gl.TRIANGLES, mtriaslength, gl.UNSIGNED_INT, 0)

            gl.bindTexture(gl.TEXTURE_2D, null)
            gl.activeTexture(gl.TEXTURE1)
            gl.bindTexture(gl.TEXTURE_2D, null)

            gl.bindFramebuffer(gl.FRAMEBUFFER, null)

            // ==== final render pass =====

            gl.useProgram(state.finalProgram)
            gl.disable(gl.DEPTH_TEST)
            gl.disable(gl.CULL_FACE)

            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, sceneTexture)

            gl.uniform1i(gl.getUniformLocation(state.finalProgram, "uSceneTexture"), 0);
            gl.uniform3f(gl.getUniformLocation(state.finalProgram, "uLight"), lightPos[0], lightPos[1], lightPos[2]);
            gl.uniformMatrix4fv(gl.getUniformLocation(state.finalProgram, "uMVP"), false, camera.mvpMatrix)

            gl.bindBuffer(gl.ARRAY_BUFFER, singleTriangleBuffer)
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * 4, 0)
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * 4, 3 * 4)
            gl.enableVertexAttribArray(1)

            gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT)
            gl.drawArrays(gl.TRIANGLES, 0, 6)

            gl.enable(gl.DEPTH_TEST)
            gl.enable(gl.CULL_FACE)

            //console.log((new Date()).getMilliseconds())
            requestAnimationFrame(state.next)
        }
        // schedule an animation at some later date
        state.next = loop
        state.next()
    })
    state.next = state.render
    state.next()
}


function setCamera(mode) {
    const canvas = document.getElementById('c')
    let aspect = canvas.width / canvas.height;
/*
    // model matrix
    let matrix = m4.identity()
    switch(mode) {
    case 'top': 
        matrix = m4.xRotate(matrix, 90 / 360 * 2 * 3.14159)
        break;
    case 'side30': 
        matrix = m4.yRotate(matrix, 90 / 360 * 2 * 3.14159)
        matrix = m4.xRotate(m4.identity(), 30 / 360 * 2 * 3.14159)
        break;
    case '30':
        matrix = m4.xRotate(matrix, 30 / 360 * 2 * 3.14159)
        break;
    case 'iso':
        matrix = m4.xRotate(matrix, 45 / 360 * 2 * 3.14159)
        matrix = m4.yRotate(matrix, 45 / 360 * 2 * 3.14159)
        break;
    }
    matrix = m4.scale(matrix, 1.0, 1.0, 1.0)
    // out light is actually tethered to the camera (overhead light, of sorts)
    const dist = 30
    let viewMatrix = m4.translate(m4.identity(), 0, 0, -dist)
    // apply view matrix to get model-view matrix
    matrix = m4.multiply(viewMatrix, matrix)
    */

    const dist = 30
    let matrix = m4.identity()
    let pos = [0, 0, -dist]

    switch(mode) {
    case 'top': 
        matrix = m4.xRotate(matrix, 90 / 360 * 2 * 3.14159)
        pos = m4.transformPoint(matrix, pos)
        matrix = m4.lookAt(pos, [0, 0, 0], [0, 0, -1])
        break;
    case 'side30': 
        matrix = m4.yRotate(m4.identity(), -90 / 360 * 2 * 3.14159)
        pos = m4.transformPoint(matrix, pos)
        matrix = m4.zRotate(m4.identity(), 30 / 360 * 2 * 3.14159)
        pos = m4.transformPoint(matrix, pos)
        matrix = m4.lookAt(pos, [0, 0, 0], [0, 1, 0])
        break;
    case '30':
        matrix = m4.xRotate(matrix, 30 / 360 * 2 * 3.14159)
        pos = m4.transformPoint(matrix, pos)
        matrix = m4.lookAt(pos, [0, 0, 0], [0, 1, 0])
        break;
    case 'iso':
        matrix = m4.xRotate(m4.identity(), 45 / 360 * 2 * 3.14159)
        pos = m4.transformPoint(matrix, pos)
        matrix = m4.yRotate(m4.identity(), 45 / 360 * 2 * 3.14159)
        pos = m4.transformPoint(matrix, pos)
        matrix = m4.lookAt(pos, [0, 0, 0], [0, 1, 0])
        break;
    }
    matrix = m4.inverse(matrix)

    // projection matrix
    let mvpMatrix = m4.perspective(3.14159/3, aspect, 0.1, dist * 4)
    // apply projection matrix to get projection-model-view matrix
    mvpMatrix = m4.multiply(mvpMatrix, matrix)

    camera.matrix = matrix;
    camera.viewMatrix = matrix;
    camera.mvpMatrix = mvpMatrix;
}


function main() {
    // initialize webgl
    const canvas = document.getElementById('c')
    const gl = canvas.getContext('webgl2')

    setCamera('30')

    if(gl === null) {
        document.writeln('failed to get GL context')
        return
    }

    state.gl = gl
    state.canvas = canvas

    // compile & link
    let vTransform = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vTransform, document.getElementById('vTransform').textContent)
    gl.compileShader(vTransform)
    if(!gl.getShaderParameter(vTransform, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile vTransform: ' + gl.getShaderInfoLog(vTransform))
    }
    state.vTransform = vTransform
    let fTransform = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fTransform, document.getElementById('fTransform').textContent)
    gl.compileShader(fTransform)
    if(!gl.getShaderParameter(fTransform, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile fTransform: ' + gl.getShaderInfoLog(fTransform))
    }
    state.fTransform = fTransform

    let vLight = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vLight, document.getElementById('vLight').textContent)
    gl.compileShader(vLight)
    if(!gl.getShaderParameter(vLight, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile vLight: ' + gl.getShaderInfoLog(vLight))
    }
    state.vLight = vLight
    let fLight = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fLight, document.getElementById('fLight').textContent)
    gl.compileShader(fLight)
    if(!gl.getShaderParameter(fLight, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile fLight: ' + gl.getShaderInfoLog(fLight))
    }
    state.fLight = fLight

    let vRender = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vRender, document.getElementById('vRender').textContent)
    gl.compileShader(vRender)
    if(!gl.getShaderParameter(vRender, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile vRender: ' + gl.getShaderInfoLog(vRender))
    }
    state.vRender = vRender
    let fRender = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fRender, document.getElementById('fRender').textContent)
    gl.compileShader(fRender)
    if(!gl.getShaderParameter(fRender, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile fRender: ' + gl.getShaderInfoLog(fRender))
    }
    state.fRender = fRender

    let vFinal = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vFinal, document.getElementById('vFinal').textContent)
    gl.compileShader(vFinal)
    if(!gl.getShaderParameter(vFinal, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile vFinal: ' + gl.getShaderInfoLog(vFinal))
    }
    state.vFinal = vFinal
    let fFinal = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fFinal, document.getElementById('fFinal').textContent)
    gl.compileShader(fFinal)
    if(!gl.getShaderParameter(fFinal, gl.COMPILE_STATUS)) {
        document.writeln('failed to compile fFinal: ' + gl.getShaderInfoLog(fFinal))
    }
    state.fFinal = fFinal


    let transformProgram = gl.createProgram()
    gl.attachShader(transformProgram, vTransform)
    gl.attachShader(transformProgram, fTransform)
    const feedbackVarying = [ "vNormal" ]
    gl.transformFeedbackVaryings(transformProgram, feedbackVarying, gl.SEPARATE_ATTRIBS)
    gl.linkProgram(transformProgram)
    state.transformProgram = transformProgram

    let program = gl.createProgram()
    gl.attachShader(program, vRender)
    gl.attachShader(program, fRender)
    gl.linkProgram(program)
    state.renderProgram = program

    let lightProgram = gl.createProgram()
    gl.attachShader(lightProgram, vLight)
    gl.attachShader(lightProgram, fLight)
    gl.linkProgram(lightProgram)
    state.lightProgram = lightProgram

    let finalProgram = gl.createProgram()
    gl.attachShader(finalProgram, vFinal)
    gl.attachShader(finalProgram, fFinal)
    gl.linkProgram(finalProgram)
    state.finalProgram = finalProgram

    // global stuff
    gl.clearColor(1.0, 0.0, 1.0, 0.0)
    gl.enable(gl.DEPTH_TEST)
    gl.viewport(0, 0, canvas.width, canvas.height)

    setup_scene()

    // bump animation state
    setInterval(() => state.animframe = state.animframe + 1, 1000.0/60.0)
}

function setValue(n) {
    state.component = n %4;
    state.next = setup_scene
}
function setDeformation(b) {
    state.deformation = b;
    state.next = state.render
}
function setColorAxis(n) {
    state.colorAxisType = n;
    document.getElementById('min').style.color = ['green', 'blue'][n];
}
function setRenderDepthDebug(b) {
    state.renderDepth = b
}

window.onload = main
