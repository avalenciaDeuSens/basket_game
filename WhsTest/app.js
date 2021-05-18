const app = new WHS.App([

    new WHS.ElementModule(), // Apply to DOM.
    new WHS.SceneModule(), // Create a new THREE.Scene and set it to app.
  
    camera = new WHS.DefineModule('camera', new WHS.PerspectiveCamera({ // Apply a camera.
      position: new THREE.Vector3(0, 0, 50)
    })),
  
    new WHS.RenderingModule({bgColor: 0xcccccc}), // Apply THREE.WebGLRenderer
    new WHS.ResizeModule() // Make it resizable.

    ,new PHYSICS.WorldModule({
      gravity: new THREE.Vector3(0, -10, 0)
      //,ammo: 'build-native-ammo.js'
    })
  ]);

  // ESfera -----------------------------------------------------------------

  const sphere = new WHS.Sphere({ // Create sphere component.
    geometry: {
      radius: 3,
      widthSegments: 32,
      heightSegments: 32
    },

    modules: [
      new PHYSICS.SphereModule({
        mass: 10,
        restitution: 0.3,
        friction: 0.8,
        damping: 0,
        margin: 0
      })
    ],
  
    material: new THREE.MeshBasicMaterial({
      color: 0xF2F2F2
      // kind: 'phong',
      // map: WHS.texture('textures/ball.png'),
      // normalMap: WHS.texture('textures/ball_normal.png'),
      // shininess: 20,
      // reflectivity: 2,
      // normalScale: new THREE.Vector2(0.5, 0.5)
    }),
  
    position: [0, 15, 0]
  });
  
  sphere.addTo(app).then(console.log(sphere)); // Add sphere to world.

  // Plano --------------------------------------------------------------------

  new WHS.Plane({
    geometry: {
      width: 100,
      height: 100
    },
  
    material: new THREE.MeshBasicMaterial({
      color: 0x447F8B
    }),
  
    rotation: {
      x: - Math.PI / 2
    },

    mass: 0,

    position: [0, 0, 0]
    
  }).addTo(app);

  new WHS.PointLight({
    light: {
      distance: 100,
      intensity: 1,
      angle: Math.PI
    },

    shadowmap: {
      width: 1024,
      height: 1024,

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
  }).addTo(app).then(console.log("Point light lista"));
  
  //app.camera.lookAt(new THREE.Vector3(0, 10, 0));

  app.start(); // Run app.

  