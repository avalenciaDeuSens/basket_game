  //var stats;
  
  const APP = {
    /* === APP: config === */
    /* GLOABAL */
    helpersActive: true,
    /* APP */
    bgColor: 0xcccccc,
    /* BALL */
    ballRadius: 6,
    /* BASKET */
    basketColor: 0xff0000,
    getBasketRadius: () => APP.ballRadius + 2,
    basketTubeRadius: 0.5,
    basketY: 20,
    basketDistance: 80,
    getBasketZ: () => APP.getBasketRadius() + APP.basketTubeRadius * 2 - APP.basketDistance,
    /* GOAL */
    //basketGoalDiff: 2.5,
    basketGoalDiff: 5,
    // basketYGoalDiff: () => APP.isMobile ? 2 : 1,
    // basketYDeep: () => APP.isMobile ? 2 : 1,
    basketYGoalDiff: () => APP.isMobile ? 10 : 1,
    basketYDeep: () => APP.isMobile ? 10 : 1,
    goalDuration: 1800, // ms.
    /* EVENTS | MOBILE */
    doubleTapTime: 200,
  
    /* === APP: variables === */
    thrown: false,
    doubletap: false,
    goal: false,
    controlsEnabled: true,
    isMobile: navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/),
  
    cursorXPosOnClick: 0,
    cursorYPosOnClick: 0,
    cursorXPosOnRelease: 0,
    cursorYPosOnRelease: 0,
    ticksWithoutDrag: 0,
  
    dragStarted: false,
    dragEnded: true,
  
    basketImpacted: false,
    firstGroundImpact: false,
  
    cursor: {
      x: 0,
      y: 0,
      xCenter: window.innerWidth / 2,
      yCenter: window.innerHeight / 2
    },
  
    force: {
      y: 6,
      z: -2,
      m: 2400,
      xk: 8
    },
  
    menu:{
      attemps:0,
      score:0,
      time: 60,
      accuracy: 0,
      markText: "Mark text"
    },
  
    gameRunning: true,
    previousElapsedTime:0,
    firstThrow:false,

    /* === APP: init === */

    init() {
        APP.world = new WHS.World({
          autoresize: "window",
          softbody: true,
    
          background: {
            color: APP.bgColor
          },
    
          fog: {
            type: 'regular',
            hex: 0xffffff
          },
    
          camera: {
            z: 50,
            y: APP.basketY,
            aspect: 45
          },
    
          physics: {
            //fixedTimeStep: APP.isMobile ? 1 / 35 : false
            //fixedTimeStep: false
            fixedTimeStep: avgDelta
            //fixedTimeStep: APP.isMobile ? 1 / 18 : false
            //fixedTimeStep: 1 / 35
            //broadphase: {type: 'dynamic'}
          },
    
          gravity: {
            y: -200
          }
        });
        console.log(APP.world);
        //console.log(APP.world.physics.fixedTimeSetp);
        
        //
        // stats = new Stats();
        // stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
        // document.body.appendChild( stats.dom );
    
        APP.camera = APP.world.getCamera();
        APP.camera.lookAt(new THREE.Vector3(0, APP.basketY, 0));
    
        //APP.ProgressLoader = new ProgressLoader(APP.isMobile ? 12 : 14);
    
        APP.createScene(); // 1
        APP.addLights(); // 2
        APP.addBasket(); // 3
        APP.addBall(); // 4
        APP.initEvents(); // 5
    
        APP.keep_ball = keep_ball(APP);
        APP.world.addLoop(APP.keep_ball);
        APP.keep_ball.start();
    
        APP.world.start(); // Ready.

        //
        //console.log(APP.isMobile);
        //document.body.addEventListener('touchstart', function(e){ e.preventDefault(); });
        //document.body.addEventListener('touchmove', function(e){ e.preventDefault(); });
        // console.log(navigator.userAgent);
      },

      // Creamos la escena --------------------------
      createScene() {
        /* Cogemos elementos menu*/
        APP.scoreText = document.getElementById('Score');
        APP.timeText = document.getElementById('Time');
        /* GROUND OBJECT */
        APP.ground = new WHS.Plane({
          geometry: {
            buffer: true,
            width: 1000,
            height: 800
          },
    
          mass: 0,
    
          material: {
            kind: 'phong',
            color: APP.bgColor
          },
    
          pos: {
            y: -20,
            z: 120
          },
    
          rot: {
            x: -Math.PI / 2
          }
        });
    
        APP.ground.getNative().addEventListener('collision', 
          () => { 
            //console.log("Ground impacted");
            if(APP.firstGroundImpact){
              APP.thrown = false;
              APP.basketImpacted = false;
              APP.firstGroundImpact = false;
            }
            else{
              APP.firstGroundImpact = true;
            }
          });
    
        APP.ground.addTo(APP.world).then(console.log("Suelo listo"));
    
        /* WALL OBJECT */
        APP.wall = APP.ground.clone();
    
        APP.wall.position.y = 180;
        APP.wall.position.z = -APP.basketDistance;
        APP.wall.rotation.x = 0;
        APP.wall.addTo(APP.world).then(console.log("Pared lista"));
    
        APP.planeForRaycasting = new THREE.Plane(new THREE.Vector3(0, 1, 0), -APP.ground.position.y - APP.ballRadius);
      },

      // Luces -----------------------------------------------------
      addLights() {
        new WHS.PointLight({
          light: {
            distance: 100,
            intensity: 1,
            angle: Math.PI
          },
    
          shadowmap: {
            // width: 1024,
            // height: 1024,

            width: 512,
            height: 512,
    
            left: -50,
            right: 50,
            top: 50,
            bottom: -50,
    
            far: 80,
    
            fov: 90
          },
    
          pos: {
            y: 60,
            z: -40
          }
        }).addTo(APP.world).then(console.log("Point light lista"));
    
        new WHS.AmbientLight({
          light: {
            intensity: 0.3
          }
        }).addTo(APP.world).then(console.log("Luz ambiente lista"));
      },

      // Canasta -----------------------------------------------------------
      addBasket() {
        /* BACKBOARD OBJECT */
        APP.backboard = new WHS.Box({
          geometry: {
            buffer: true,
            width: 41,
            depth: 1,
            height: 28
          },
    
          mass: 0,
    
          material: {
            kind: 'standard',
            map: WHS.texture('textures/backboard/1/backboard.jpg'),
            normalMap: WHS.texture('textures/backboard/1/backboard_normal.jpg'),
            displacementMap: WHS.texture('textures/backboard/1/backboard_displacement.jpg'),
            normalScale: new THREE.Vector2(0.3, 0.3),
            metalness: 0,
            roughness: 0.3
          },
    
          pos: {
            y: APP.basketY + 10,
            z: APP.getBasketZ() - APP.getBasketRadius()
          }
        });
    
        APP.backboard.addTo(APP.world).then(console.log("Panel listo"));
    
        /* BASKET OBJECT */
        APP.basket = new WHS.Torus({
          geometry: {
            buffer: true,
            radius: APP.getBasketRadius(),
            tube: APP.basketTubeRadius,
            radialSegments: APP.isMobile ? 6 : 8,
            tubularSegments: 16
          },
    
          shadow: {
            cast: false
          },
    
          mass: 0,
    
          material: {
            kind: 'standard',
            color: APP.basketColor,
            metalness: 0.8,
            roughness: 0.5,
            emissive: 0xffccff,
            emissiveIntensity: 0.2
          },
    
          pos: {
            y: APP.basketY,
            z: APP.getBasketZ()
          },
    
          physics: {
            type: 'concave'
          },
    
          rot: {
            x: Math.PI / 2
          }
        });
        
        APP.basket.getNative().addEventListener('collision', 
          () => { 
            console.log("Basket impacted");
            APP.basketImpacted = true; 
          });
        //console.log(APP.basket.getNative());
    
        APP.basket.addTo(APP.world).then(console.log("Canasta lista"));
    
        /* NET OBJECT */
        APP.net = new WHS.Cylinder({
          geometry: {
            radiusTop: APP.getBasketRadius(),
            radiusBottom: APP.getBasketRadius() - 3,
            height: 15,
            openEnded: true,
            heightSegments: APP.isMobile ? 2 : 3,
            radiusSegments: APP.isMobile ? 8 : 16
          },
    
          shadow: {
            cast: false
          },
    
          // physics: {
          //   pressure: 2000,
          //   friction: 0.02,
          //   margin: 0.5,
          //   anchorHardness: 0.5,
          //   viterations: 2,
          //   piterations: 2,
          //   diterations: 4,
          //   citerations: 0,
          //   group: 1,
          //   mask: 2
          // },
          physics: false,
    
          // mass: 30,
          // softbody: true,
    
          material: {
            map: WHS.texture('textures/net4.png', { repeat: { y: 0.7, x: 2 }, offset: { y: 0.3 } }), // 0.85, 19
            transparent: true,
            opacity: 0.7,
            kind: 'basic',
            side: THREE.DoubleSide,
            depthWrite: false
          },
    
          pos: {
            y: APP.basketY - 8,
            z: APP.getBasketZ()
          }
        });
    
        APP.net.addTo(APP.world).then(() => {
          // APP.net.getNative().frustumCulled = false;
          // const netRadSegments = APP.isMobile ? 8 : 16;
    
          // for (let i = 0; i < netRadSegments; i++) {
          //   APP.net.appendAnchor(APP.world, APP.basket, i, 0.8, true);
          // }
    
          console.log("Red lista");
        });
      },

      // La pelota -------------------------------------------------------------
      addBall() {
        /* BALL OBJECT */
        APP.ball = new WHS.Sphere({
          geometry: {
            buffer: true,
            radius: APP.ballRadius,
            widthSegments: APP.isMobile ? 16 : 32,
            heightSegments: APP.isMobile ? 16 : 32
          },
    
          mass: 120,
    
          material: {
            kind: 'phong',
            map: WHS.texture('textures/ball.png'),
            normalMap: WHS.texture('textures/ball_normal.png'),
            shininess: 20,
            reflectivity: 2,
            normalScale: new THREE.Vector2(0.5, 0.5)
          },
    
          physics: {
            restitution: 3
          }
        });
    
        APP.ball.addTo(APP.world).then(console.log("Pelota lista"));
      },
    
      /* === APP: Events === */
    
      initEvents() {
        EVENTS._move(APP);
        EVENTS._click(APP);
        EVENTS._keypress(APP);
        EVENTS._resize(APP);
    
        //APP.ProgressLoader.step();
      },
    
      updateCoords(e) {
        //e.preventDefault();
    
        APP.cursor.x = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
        APP.cursor.y = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
    
        // console.log("Updating coords");
    
        //
        if(!APP.dragStarted){
          APP.getInitialCursor();
          APP.dragStarted = true;
        }
        APP.ticksWithoutDrag = 0;
      },
    
      checkKeys(e) {
        e.preventDefault();
        if (e.code === "Space") APP.thrown = false;
      },
    
      detectDoubleTap() {
        if (!APP.doubletap) {
          // Wait for second click.
          APP.doubletap = true;
    
          setTimeout(() => {
            APP.doubletap = false;
          }, APP.doubleTapTime);
    
          return false;
        } else {
          // Double tap triggered.
          APP.thrown = false;
          APP.doubletap = true;
          console.log("Double tap");
          return true;
        }
      },

      /* === APP: Functions === */
  /* Func: 1 Section. GAME */

  throwBall(e) {
    //
    if(e)
      e.preventDefault();
    //
    if(!APP.firstThrow)
      APP.firstThrow = true;
    //console.log("Throwing ball");
    if (!APP.detectDoubleTap() && APP.controlsEnabled && !APP.thrown) {
      //const vector = new THREE.Vector3(APP.force.xk * (APP.cursor.x - APP.cursor.xCenter), APP.force.y * APP.force.m, APP.force.z * APP.force.m);
      const vector = new THREE.Vector3(APP.force.xk * (APP.cursorXPosOnRelease - APP.cursorXPosOnClick), 
                                        (APP.cursorYPosOnClick - APP.cursorYPosOnRelease) * 0.02 * APP.force.m, APP.force.z * APP.force.m);

      APP.ball.setLinearVelocity(new THREE.Vector3(0, 0, 0)); // Reset gravity affect.

      APP.ball.applyCentralImpulse(vector);

      vector.multiplyScalar(10 / APP.force.m);
      vector.y = vector.x;
      vector.x = APP.force.y;
      vector.z = 0;

      APP.ball.setAngularVelocity(vector); // Reset gravity affect.
      APP.thrown = true;
      // Aqui aun no tenemos menu
      APP.menu.attempts++;
    }
  },

  // releaseBall(e) {
  //   e.preventDefault();
  //   // console.log("Releasing");
  // },

  getInitialCursor(){
    const cursor = APP.cursor;
    APP.cursorXPosOnClick = cursor.x;
    APP.cursorYPosOnClick = cursor.y;
    // console.log("Getting initial cursor");
  },

  keepBall() {
    //console.log("Keeping ball");
    APP.ball.setLinearVelocity(new THREE.Vector3(0, 0, 0));
    APP.ball.setAngularVelocity(new THREE.Vector3(0, 0, 0));
    const cursor = APP.cursor;

    // const x = (cursor.x - cursor.xCenter) / window.innerWidth * 32;
    // const y = -(cursor.y - cursor.yCenter) / window.innerHeight * 32;
    const x = 0;
    const y = 0;
    //   cursorXPosOnClick: 0,
    //  cursorYPosOnClick: 0,
    APP.cursorXPosOnRelease = cursor.x;
    APP.cursorYPosOnRelease = cursor.y;

    APP.ball.position.set(x, y, -36);
  },

  update(){
    //
    //stats.begin();
    //
    if(APP.dragStarted){
      APP.ticksWithoutDrag++;
      if(APP.ticksWithoutDrag > 2){
        APP.throwBall();
        APP.dragStarted = false;
      }
    }
    //
    //stats.end();
  },

  // preventMotion(event)
  // {
  //     window.scrollTo(0, 0);
  //     if(event != null){
  //       event.preventDefault();
  //       event.stopPropagation();
  //     }      
  // },

  showPanel(){
    var scorePanel = document.getElementById("ranking");
    scorePanel.hidden = false;
  },

};

//
//APP.init();
//console.log(APP.world);
console.log(APP);

// Arrancamos con un chequeo inicial de 30 pasos

var clock = new THREE.Clock();
var delta = 0;
var totalDelta = 0;
var avgDelta = 0;
var iterations = 0;
var initRunning = true;

render();
function render(){
  //
  if(initRunning){
    requestAnimationFrame(render);
    
    iterations++;
    delta = clock.getDelta();
    console.log("Running iteration: " + iterations + ", delta time: " + delta);
    totalDelta += delta;
    //
    if(iterations >= 30){
      initRunning = false;
      clock.stop();
      avgDelta = totalDelta / 30 * 3;
      console.log("Ending init, avg delta (doubled): " + avgDelta + ", fps: " + (1 / avgDelta));
      //APP.world.physics.fixedTimeStep = avgDelta / 2;
      //APP.init();      
    }
  }  
  else{
    //
    console.error("No debería pasar por aqui"); 
  }
  
}