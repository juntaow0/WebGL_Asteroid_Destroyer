    "use strict";
/* exported Scene */
class Scene extends UniformProvider {
  constructor(gl) {
    super("scene");
    this.programs = [];

    this.vsTextured = new Shader(gl, gl.VERTEX_SHADER, "textured-vs.glsl");    
    this.fsTextured = new Shader(gl, gl.FRAGMENT_SHADER, "textured-fs.glsl");
    this.programs.push( 
        this.texturedProgram = new TexturedProgram(gl, this.vsTextured, this.fsTextured));
    this.vsBackground = new Shader(gl, gl.VERTEX_SHADER, "background-vs.glsl");
    this.programs.push( 
        this.backgroundProgram = new TexturedProgram(gl, this.vsBackground, this.fsTextured));
    
    this.vsAnimation = new Shader(gl,gl.VERTEX_SHADER,"animation-vs.glsl");
    this.programs.push(
      this.animationProgram = new TexturedProgram(gl,this.vsAnimation,this.fsTextured));

    this.texturedQuadGeometry = new TexturedQuadGeometry(gl);    

    this.gameObjects = [];
    this.boomObjects = [];

    this.backgroundMaterial = new Material(this.backgroundProgram);
    this.backgroundMaterial.colorTexture.set(new Texture2D(gl, "media/background.jpg"));
    this.backgroundMesh = new Mesh(this.backgroundMaterial, this.texturedQuadGeometry);
    this.background = new GameObject( this.backgroundMesh );
    this.background.update = function(){};
    this.gameObjects.push(this.background);

    this.raiderMaterial = new Material(this.texturedProgram);
    this.raiderMaterial.colorTexture.set(new Texture2D(gl, "media/raider.png"));
    this.raiderMesh = new Mesh(this.raiderMaterial, this.texturedQuadGeometry);
    this.avatar = new GameObject( this.raiderMesh );
    this.avatar.isAvatar = true;
    this.avatar.position.set(-49, -49)
    this.avatar.backDrag = 0.7;
    this.avatar.sideDrag = 0.05;
    this.avatar.angularDrag = 0.1;
    this.gameObjects.push(this.avatar);

    this.afterBurnerMaterial = new Material(this.texturedProgram);
    this.afterBurnerMaterial.colorTexture.set(new Texture2D(gl, "media/afterburner.png"));
    this.afterBurnerMesh = new Mesh(this.afterBurnerMaterial, this.texturedQuadGeometry);
    this.leftBurner = new GameObject(this.afterBurnerMesh);
    this.rightBurner = new GameObject(this.afterBurnerMesh);

    this.leftBurner.parent = this.avatar;
    this.rightBurner.parent = this.avatar;
    this.leftBurner.scale = new Vec3(-0.8,-0.25,0);
    this.rightBurner.scale = new Vec3(-0.8,0.25,0);
    this.leftBurner.position = new Vec3(-1.65,0.48,0);
    this.rightBurner.position = new Vec3(-1.65,-0.48,0);

    this.asteroidMaterial = new Material(this.texturedProgram);
    this.asteroidMaterial.colorTexture.set(new Texture2D(gl, "media/asteroid.png"));
    this.asteroidMesh = new Mesh(this.asteroidMaterial, this.texturedQuadGeometry);

    this.boomMaterial = new Material(this.animationProgram);
    this.boomMaterial.colorTexture.set(new Texture2D(gl,"media/boom.png"));
    this.boomMesh = new Mesh(this.boomMaterial, this.texturedQuadGeometry);

    this.ammoMaterial = new Material(this.texturedProgram);
    this.ammoMaterial.colorTexture.set(new Texture2D(gl,"media/plasma.png"));
    this.ammoMesh = new Mesh(this.ammoMaterial, this.texturedQuadGeometry);

    const genericMove = function(t, dt){
      const acceleration = new Vec3(this.force).mul(this.invMass);
      this.velocity.addScaled(dt, acceleration);
      this.position.addScaled(dt, this.velocity);

      const angularAcceleration = this.torque*this.invAngularMass;
      this.angularVelocity+=dt*angularAcceleration;
      this.orientation+=dt*this.angularVelocity;
      
      const ahead = new Vec3(Math.cos(this.orientation),Math.sin(this.orientation),0);
      const aheadVelocity = ahead.mul(ahead.dot(this.velocity));
      const sideVelocity = this.velocity.minus(aheadVelocity);

      this.velocity = new Vec3();
      this.velocity.addScaled(Math.pow(this.backDrag,dt), aheadVelocity);
      this.velocity.addScaled(Math.pow(this.sideDrag,dt), sideVelocity);
      this.angularVelocity *= Math.pow(this.angularDrag,dt);
    };

    const asteroidCollision = function(t, dt, keysPressed, colliders){
      for (const collider of colliders){
        if (collider===this){
          continue;
        }
        let diff = this.position.minus(collider.position);
        let dist2 = diff.dot(diff);
        if (dist2<3.5){
          if (collider.isAmmo){
            if (dist2<1.5){
              this.collision = true;
              collider.destroyed = true;
              collider.position = new Vec3(-70,-70);
            }
          } else {
            const restitutionCoeff = 0.7;
            const fricCoeff = 0.5;
            const normal = diff.direction();
            const tangent = new Vec2(-1*normal.y,normal.x);
            this.position.addScaled(dt,normal);
            collider.position.addScaled(-1*dt,normal);
            const relativeVelocity = this.velocity.minus(collider.velocity);
            relativeVelocity.addScaled(-1*this.angularVelocity*1.75-collider.angularVelocity*1.75,tangent);
            const impMag = normal.dot(relativeVelocity)/2*(1+restitutionCoeff);
            const fricImpMag = tangent.dot(relativeVelocity)/2*fricCoeff;
            this.velocity.addScaled(-1*impMag/1,normal);
            collider.velocity.addScaled(1*impMag/1,normal);
            this.velocity.addScaled(-1*fricImpMag/1,tangent);
            collider.velocity.addScaled(1*fricImpMag/1,tangent);
            this.angularVelocity+=fricImpMag*1;
            collider.angularVelocity+=fricImpMag*1;
          }
        }
      }
    }

    this.ammoMove = function(t, dt){
      const acceleration = new Vec3(this.force).mul(this.invMass);
      this.velocity.addScaled(dt, acceleration);
      this.position.addScaled(dt, this.velocity);

      const angularAcceleration = this.torque*this.invAngularMass;
      this.angularVelocity+=dt*angularAcceleration;
      this.orientation+=dt*this.angularVelocity;
      
      const ahead = new Vec3(Math.cos(this.orientation),Math.sin(this.orientation),0);
      const aheadVelocity = ahead.mul(ahead.dot(this.velocity));
      const sideVelocity = this.velocity.minus(aheadVelocity);

      this.velocity = new Vec3();
      this.velocity.addScaled(Math.pow(this.backDrag,dt), aheadVelocity);
      this.velocity.addScaled(Math.pow(this.sideDrag,dt), sideVelocity);
      this.angularVelocity *= Math.pow(this.angularDrag,dt);
    };

    for(let i=0; i < 100; i++){
      const asteroid = new GameObject( this.asteroidMesh );
      asteroid.position.setRandom(new Vec3(-40, -40, 0), new Vec3(50, 50, 0) );
      asteroid.velocity.setRandom(new Vec3(-5, -5, 0), new Vec3(5, 5, 0));
      asteroid.angularVelocity = Math.random(-2, 2);
      this.gameObjects.push(asteroid);
      asteroid.move = genericMove;
      asteroid.control = asteroidCollision;
    }

    this.avatar.control = function(t, dt, keysPressed, colliders){
      // PRACTICAL TODO
      this.thrust = 0;
      if(keysPressed.UP) {
        this.thrust += 4;
      } else if (keysPressed.DOWN){
        this.thrust -= 4;
      }
      this.torque = 0;
      if(keysPressed.LEFT) {
        this.torque += 4;
      } else if (keysPressed.RIGHT){
        this.torque -= 4;
      }
      // compute ahead vector from orientation; force as ahead*thrust
      const ahead = new Vec3(Math.cos(this.orientation),Math.sin(this.orientation),0);
      this.force=ahead.mul(this.thrust);

      // collision
      for (const collider of colliders){
        if (collider===this||collider.isAmmo){
          continue;
        }

        let diff = this.position.minus(collider.position);
        let dist2 = diff.dot(diff);
        if (dist2<3.5){
          const restitutionCoeff = 0.8;
          const fricCoeff = 0.5;
          const normal = diff.direction();
          const tangent = new Vec2(-1*normal.y,normal.x);
          this.position.addScaled(dt,normal);
          collider.position.addScaled(-1*dt,normal);
          const relativeVelocity = this.velocity.minus(collider.velocity);
          relativeVelocity.addScaled(-1*this.angularVelocity*1.5-collider.angularVelocity*1.5,tangent);
          const impMag = normal.dot(relativeVelocity)/2*(1+restitutionCoeff);
          const fricImpMag = tangent.dot(relativeVelocity)/2*fricCoeff;
          this.velocity.addScaled(-1*impMag/1,normal);
          collider.velocity.addScaled(1*impMag/1,normal);
          this.velocity.addScaled(-1*fricImpMag/1,tangent);
          collider.velocity.addScaled(1*fricImpMag/1,tangent);
          this.angularVelocity+=fricImpMag*1;
          collider.angularVelocity+=fricImpMag*1;
          this.collision = true;
        }
      }
    }; 
    
    this.avatar.move = genericMove;

    this.animSpeed = 36;
    this.boomSize = 1/6;

    this.boomUpdate = function(ct,speed,size) {
      const t = (ct-this.time)/1000.0;
      const phase = Math.floor(t * speed) % 36;
      this.modelMatrix = new Mat4().scale(this.scale).rotate(this.orientation).translate(this.position);
      if (this.parent) {
        this.parent.update();
        this.modelMatrix.mul(this.parent.modelMatrix);
      }
      this.offset.set((Math.floor(t*speed))%6,(Math.floor(t*speed*size))%6,0,0);
      if (phase===35){
        this.animEnd = true;
      }
    };

    this.lastSPACE = false;
    this.lastR = false;
    this.respawn = false;
    this.fire = false;
    this.lastFire = 0;

    this.timeAtFirstFrame = new Date().getTime();
    this.timeAtLastFrame = this.timeAtFirstFrame;

    this.camera = new OrthoCamera(...this.programs); 
    this.addComponentsAndGatherUniforms(...this.programs);

    gl.enable(gl.BLEND);
    gl.blendFunc(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(gl, canvas) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    this.camera.setAspectRatio(canvas.width / canvas.height);
  }

  update(gl, keysPressed) {
    //jshint bitwise:false
    //jshint unused:false
    const timeAtThisFrame = new Date().getTime();
    const dt = (timeAtThisFrame - this.timeAtLastFrame) / 1000.0;
    const t = (timeAtThisFrame - this.timeAtFirstFrame) / 1000.0; 
    

    // border control
    for (const gameObject of this.gameObjects){
      if (!gameObject.isAmmo&&(!gameObject.destroyed))
      {
        if (gameObject.position.x<-50){
          gameObject.position.x = 50;
        } else if (gameObject.position.x>50){
          gameObject.position.x = -50;
        }
        if (gameObject.position.y<-50){
          gameObject.position.y = 50;
        } else if (gameObject.position.y>50){
          gameObject.position.y = -50;
        }
      }
    }

    if (!this.avatar.destroyed){
      this.camera.position = this.avatar.position;
    }
    
    this.camera.update();

    // clear the screen
    gl.clearColor(0.3, 0.0, 0.3, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (keysPressed.R&&keysPressed.R!==this.lastR){
      if (this.avatar.destroyed)
      {
        this.respawn = true;
      }
    }

    if (keysPressed.SPACE&&keysPressed.SPACE!==this.lastSPACE){
      if ((timeAtThisFrame-this.lastFire)/1000.0>1.5){
        this.fire = true;
      }
    }

    if (this.respawn){
      this.avatar.velocity = new Vec3(0,0,0);
      this.avatar.angularVelocity = 0;
      this.avatar.orientation = 0;
      this.avatar.position.set(-49,-49,0);
      this.avatar.destroyed = false;
      this.respawn = false;
    }

    if (this.fire){
      const ammo = new GameObject(this.ammoMesh);
      ammo.isAmmo = true;
      ammo.scale.set(0.3,0.3,0);
      ammo.move = this.ammoMove;
      ammo.position = new Vec3(this.avatar.position);
      ammo.velocity = new Vec3(Math.cos(this.avatar.orientation),Math.sin(this.avatar.orientation),0).mul(15);
      ammo.velocity.add(this.avatar.velocity);
      ammo.orientation = this.avatar.orientation;
      this.gameObjects.push(ammo);
      this.lastFire = timeAtThisFrame;
      this.fire = false;
    }

    for (const gameObject of this.gameObjects){
      if (gameObject.collision){
        const boom = new GameObject(this.boomMesh);
        boom.position = new Vec3(gameObject.position);
        boom.scale.set(1.5,1.5,0);
        boom.time = new Date().getTime(); 
        boom.update = this.boomUpdate;
        this.boomObjects.push(boom);
        gameObject.thrust=0;
        gameObject.torque=0;
        gameObject.collision = false;
        if (gameObject.isAvatar){
          gameObject.position = new Vec3(-60,-60,0);
          gameObject.destroyed = true;
        } else {
          const sign = Math.random() < 0.5 ? -1 : 1;
          gameObject.position.x = (this.avatar.position.x+15*sign)%50;
          gameObject.position.y = (this.avatar.position.y+15*sign)%50;
          gameObject.velocity.setRandom(new Vec3(-5, -5, 0), new Vec3(5, 5, 0));
          gameObject.angularVelocity = Math.random(-2, 2);
        }
      }
    }

    for(const gameObject of this.gameObjects) {
      if (gameObject.destroyed){
        continue;
      }
      gameObject.control(t, dt, keysPressed, this.gameObjects);
    }

    for(const gameObject of this.gameObjects) {
      if (gameObject.destroyed){
        continue;
      }
      gameObject.move(t, dt);
    }

    for(const gameObject of this.gameObjects) {
      if (gameObject.destroyed){
        continue;
      }
      gameObject.update();
    }
    for(const gameObject of this.gameObjects) {
      if (gameObject.destroyed){
        continue;
      }
      gameObject.draw(this, this.camera);
    }

    for (const boomObject of this.boomObjects) {
      boomObject.update(timeAtThisFrame,this.animSpeed,this.boomSize);
    }

    for (const boomObject of this.boomObjects) {
      boomObject.draw(this, this.camera);
    } 

    if (this.avatar.torque>0){
      this.rightBurner.update();
      this.rightBurner.draw(this,this.camera);
    } else if (this.avatar.torque<0){
      this.leftBurner.update();
      this.leftBurner.draw(this,this.camera);
    } else if (!this.avatar.torque && this.avatar.thrust>0){
      this.leftBurner.update();
      this.rightBurner.update();
      this.leftBurner.draw(this,this.camera);
      this.rightBurner.draw(this,this.camera);
    }

    this.boomObjects = this.boomObjects.filter(element => !element.animEnd);
    this.gameObjects = this.gameObjects.filter(element => 
      !(element.position.x<-60 || element.position.x>60
      || element.position.y<-60 || element.position.y>60));
    this.lastR = keysPressed.R;
    this.lastSPACE = keysPressed.SPACE;
    this.timeAtLastFrame = timeAtThisFrame;
  }
}
