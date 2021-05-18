var deltaTime;
// Keep a ball and goal detection.
const keep_ball = APP => {
    return new WHS.Loop((clock) => {
    
    //
    deltaTime = clock.getElapsedTime() - APP.previousElapsedTime;
    APP.previousElapsedTime = clock.getElapsedTime();
    //console.log(clock);
    //stats.begin();
    //
      if(APP.gameRunning){
  
        //APP.menu.time -= APP.isMobile ? 0.04 : 0.01;        
        //APP.world.__defaults.physics.fixedTimeStep = deltaTime * 10;
        //console.log(APP.world.__params.physics.fixedTimeStep);

        //
        if(APP.firstThrow){
          APP.menu.time -= deltaTime;
          APP.timeText.innerHTML = "Tiempo " + Math.ceil(APP.menu.time);

          if(APP.menu.time <= 0 && APP.gameRunning){
            APP.gameRunning = false;
            APP.menu.time = 0;
            // Sacamos el panel
            APP.showPanel();
          }
        }        
  
        // Aguantamos la bola si no la hemos lanzado
        if (!APP.thrown) APP.keepBall();
  
        APP.update();
  
        const BLpos = APP.ball.position;
        const BSpos = APP.basket.position;
  
        // TODO: Revisar condicion para que detecte también entrada rápida
        if (BLpos.distanceTo(BSpos) < APP.basketGoalDiff && Math.abs(BLpos.y - BSpos.y + APP.basketYDeep()) < APP.basketYGoalDiff() && !APP.goal) {
        //if (BLpos.distanceTo(BSpos) < APP.basketGoalDiff && BLpos.y - BSpos.y + APP.basketYDeep() < APP.basketYGoalDiff() && !APP.goal) {
          
          if(!APP.basketImpacted){
            APP.menu.score += 3;
          }
          else{
            APP.menu.score += 2;
          }
          console.log("Canasta, puntuación: " + APP.menu.score);
          APP.thrown = false;
          APP.basketImpacted = false;
          APP.firstGroundImpact = false;
          //
          APP.scoreText.innerHTML = "Puntuacion " + APP.menu.score;
        }
      }

    //
    //stats.end();
    //console.log(stats);
    });
  };