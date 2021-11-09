const LANE_CHANGE_SPEED = 3.0;
const LANE_CHANGE_ANG = 0.05 * Math.PI;
const TRAFFIC_CAR_MIN_SPEED = 8;
const TRAFFIC_CAR_MAX_SPEED = 12;
const TRAFFIC_CAR_SPEED_MAX_DELTA = 3;
const CLOSE_ENOUGH_TO_COLLIDE = 20;
const CLOSE_ENOUGH_TO_AVOID = 60;
const COLLISION_EFFECT_TIME = 15;
const COLLISION_EFFECT_MULT = 3;
const FRAMES_TILL_TURNING_TO_BLINK = 20;

var trafficCarPoints = [{x: 0, y:7},
                        {x:0,y:2},
                        {x:1,y:1},
                        {x:3,y:0},
                        {x:7,y:0},
                        {x:9,y:2},
                        {x:12,y:2},
                        {x:14,y:0},
                        {x:18,y:0},
                        {x:19,y:2},
                        {x:22,y:2},
                        {x:23,y:4},
                        {x:23,y:7},
                        {x:20,y:7}];

function mirrorVector() {
    var mirrorY = -1000;
    var i; // For loop counter.

    for (i = 0; i < trafficCarPoints.length; i++) {
        trafficCarPoints[i].y -= 7;
    }

    for (i = 0; i < trafficCarPoints.length; i++) {
        if (trafficCarPoints[i].y > mirrorY) {
            mirrorY = trafficCarPoints[i].y;
        }
    }

    var mirrorCar = JSON.parse(JSON.stringify(trafficCarPoints));
    mirrorCar.reverse();

    for (i = 0; i < mirrorCar.length; i++) {
        var distFromMirror = mirrorY - mirrorCar[i].y;
        mirrorCar[i].y = mirrorY + distFromMirror;
    }

    trafficCarPoints = trafficCarPoints.concat(mirrorCar);
}

function setupVectorDim() {
    var leftMost = 1000.0;
    var rightMost = -1000.0;
    var topMost = 1000.0;
    var bottomMost = -1000.0;

    for(var i=0;i<trafficCarPoints.length;i++) {
        if(trafficCarPoints[i].x < leftMost) {
            leftMost = trafficCarPoints[i].x;
        }

        if(trafficCarPoints[i].x > rightMost) {
            rightMost = trafficCarPoints[i].x;
        }

        if(trafficCarPoints[i].y < topMost) {
            topMost = trafficCarPoints[i].y;
        }
        
        if(trafficCarPoints[i].y > bottomMost) {
            bottomMost = trafficCarPoints[i].y;
        }
    // same for y with top and bottom
    }

    vectorWid = rightMost - leftMost;
    vectorHei = bottomMost - topMost;
}

function setupTrafficCarImage()                        {
    mirrorVector();
    setupVectorDim();
}

function trafficCarClass() {

    this.x = 5;
    this.y = 5;
    this.targetX = 5;
    this.lanePerc = 0.4;
    this.framesTillLaneSwitch = 0;
    this.angle = -0.5 * Math.PI;
    this.speed = 6;
    this.steeringOverrideDir = 0;
    this.steeringOverrideTimer = 0;
    this.readyToRemove = false;
    this.goingSouth = false;
    this.directionOfPlayerCar = 0;
    this.gotScored = 0;
    this.spawnedTop = false;

    this.init = function() {
        this.goingSouth = Math.random() < 0.5;
        if (this.goingSouth || Math.random() < 0.5) {
            this.resetTop();
        } else {
            this.resetBottom(); 
        }

        if (this.goingSouth) {
            this.directionOfPlayerCar = -1;
            this.startOnTrack(0.6, 0.9);
        } else {
            if (this.spawnedTop) {
                this.directionOfPlayerCar = 1;
            } else {
                this.directionOfPlayerCar = 0;
            }
            this.startOnTrack(0.1, 0.4);
        }
    };

    this.resetTop = function() {
        //this.y = 0;
        this.y = TRACK_H * 4;
        this.spawnedTop = true;
    };

    this.resetBottom = function() {
        this.y = (TRACK_ROWS - 4) * TRACK_H;
        this.spawnedTop = false;
        //this.y = p1.carY;
        //console.log("resetBottom: " + p1.carY + " " + (TRACK_ROWS - 4) * TRACK_H);
        
    };

    this.startOnTrack = function(leftSide, rightSide) {
        var boundaries = getTrackBoundriesAt(this.y);
        this.lanePerc = randomInRange(leftSide, rightSide);
        /*console.log("startOnTrack: lanePerc=" + this.lanePerc + 
                    "\nleftSidePixels=" + boundaries.leftSidePixels + 
                    "\nrightSidePixels=" + boundaries.rightSidePixels);*/
        this.x = this.lanePerc * boundaries.leftSidePixels + (1.0 - this.lanePerc) * boundaries.rightSidePixels;
    };

    this.move = function() {
        this.y += p1.currentCarMoveDelta;


        //console.log("AI Speed = " + this.speed + "\n Player Speed =" + p1.carSpeed);

        if (this.goingSouth) {
            this.y += this.speed;
        } else {
            this.y -= this.speed;
        }

        if (this.y < 0) {
            //this.resetBottom();
            this.readyToRemove = true;
        }

        if (this.y > TRACK_ROWS * TRACK_H) {
            //this.resetTop();
            this.readyToRemove = true;
        }

        var xDistFromP1 = Math.abs(p1.carX - this.x);
        var yDistFromP1 = Math.abs(p1.carY - this.y);
        var approxDist = xDistFromP1 + yDistFromP1;

        if (this.gotScored == 0) {
            // Opposing traffic
            if (this.directionOfPlayerCar == -1) {
                if (p1.carY < this.y) {

                    var wallBounds = getTrackBoundriesAt(p1.carY);
                    var enoughOverToCount = 0.55;
                    var middleX = wallBounds.leftSidePixels * enoughOverToCount +
                        wallBounds.rightSidePixels * (1.0 - enoughOverToCount);

                    this.directionOfPlayerCar = 0;
                    if (p1.carX < middleX && p1.spinoutTimer <= 0 && p1.carSpeed > CAR_SCORE_SPEED) {
                        //this.gotScored = 1;
                        if (xDistFromP1 <= CAR_PASS_SOUTHBOUND_SCORE_DIST_NEAR) {
                            spawnPointPopper(CAR_PASS_SOUTHBOUND_SCORE_BONUS_NEAR, this.x, this.y, passingDistToWord(CAR_PASS_NORTHBOUND_GOT_SCORED_NEAR));
                            this.gotScored = CAR_PASS_SOUTHBOUND_GOT_SCORED_NEAR;
                            console.log("South Near!");
                        }
                        else if (xDistFromP1 <= CAR_PASS_SOUTHBOUND_SCORE_DIST_MED) {
                            spawnPointPopper(CAR_PASS_SOUTHBOUND_SCORE_BONUS_MED, this.x, this.y, passingDistToWord(CAR_PASS_NORTHBOUND_GOT_SCORED_MED));
                            this.gotScored = CAR_PASS_SOUTHBOUND_GOT_SCORED_MED;
                            console.log("South Med!");
                        }
                        else if (xDistFromP1 <= CAR_PASS_SOUTHBOUND_SCORE_DIST_FAR) {
                            spawnPointPopper(CAR_PASS_SOUTHBOUND_SCORE_BONUS_FAR, this.x, this.y, passingDistToWord(CAR_PASS_NORTHBOUND_GOT_SCORED_FAR));
                            this.gotScored = CAR_PASS_SOUTHBOUND_GOT_SCORED_FAR;
                            console.log("South Far!");
                        }
                        //spawnPointPopper(Math.floor(xDistFromP1), this.x, this.y);
                        //spawnPointPopper(CAR_PASS_SOUTHBOUND_SCORE_BONUS, this.x, this.y);
                    }
                }
            }

            // Going same direction
            if (this.directionOfPlayerCar == 1) {
                if (p1.carY < this.y) {
                    if (p1.carSpeed > this.speed) {
                        this.directionOfPlayerCar = 0;

                        if (p1.spinoutTimer <= 0) {
                            //this.gotScored = 2;
                            if (xDistFromP1 <= CAR_PASS_NORTHBOUND_SCORE_DIST_NEAR) {
                                spawnPointPopper(CAR_PASS_NORTHBOUND_SCORE_BONUS_NEAR, this.x, this.y, passingDistToWord(CAR_PASS_SOUTHBOUND_GOT_SCORED_NEAR));
                                this.gotScored = CAR_PASS_NORTHBOUND_GOT_SCORED_NEAR;
                                console.log("North Near!");
                            }
                            else if (xDistFromP1 <= CAR_PASS_NORTHBOUND_SCORE_DIST_MED) {
                                spawnPointPopper(CAR_PASS_NORTHBOUND_SCORE_BONUS_MED, this.x, this.y, passingDistToWord(CAR_PASS_SOUTHBOUND_GOT_SCORED_MED));
                                this.gotScored = CAR_PASS_NORTHBOUND_GOT_SCORED_MED;
                                console.log("North Med!");
                            }
                            else if (xDistFromP1 <= CAR_PASS_NORTHBOUND_SCORE_DIST_FAR) {
                                spawnPointPopper(CAR_PASS_NORTHBOUND_SCORE_BONUS_FAR, this.x, this.y, passingDistToWord(CAR_PASS_SOUTHBOUND_GOT_SCORED_FAR));
                                this.gotScored = CAR_PASS_NORTHBOUND_GOT_SCORED_FAR;
                                console.log("North Far!");
                            }
                            //spawnPointPopper(CAR_PASS_NORTHBOUND_SCORE_BONUS, this.x, this.y);
                            //spawnPointPopper(Math.floor(xDistFromP1), this.x, this.y);
                        }
                    }
                }
            }
        }

        if (approxDist < CLOSE_ENOUGH_TO_COLLIDE) {
            if (this.x < p1.carX) {
                this.steeringOverrideDir = -1;
            }
            else
            {
                this.steeringOverrideDir = 1;
            }

            this.steeringOverrideTimer = COLLISION_EFFECT_TIME;
            this.speed *= 0.5;
            p1.wreckCar(15);
            //console.log("Car is hit!");
        }

        var boundaries = getTrackBoundriesAt(this.y);
        var carCenterMarginToRoadEdge = 15;
        var carCenterMarginToRoadMedian = 30;
        boundaries.leftSidePixels += carCenterMarginToRoadEdge;
        boundaries.rightSidePixels -= carCenterMarginToRoadEdge;
        this.targetX = this.lanePerc * boundaries.leftSidePixels + (1.0 - this.lanePerc) * boundaries.rightSidePixels;
        var middleOfRoad = (boundaries.leftSidePixels + boundaries.rightSidePixels) / 2;
        this.angle = -0.5 * Math.PI;

        var distFromMiddle;
        if (this.steeringOverrideDir == 0) {
            var safelyMiddleOfLanePerc;
            if (this.lanePerc > 0.5) {
                distFromMiddle = Math.abs(0.75 - this.lanePerc) * 4;
                safelyMiddleOfLanePerc = 1 - distFromMiddle * distFromMiddle * distFromMiddle;
                if (this.x > middleOfRoad + carCenterMarginToRoadMedian) {
                    safelyMiddleOfLanePerc = 0;
                    this.x = middleOfRoad + carCenterMarginToRoadMedian;
                }

                if (this.x < boundaries.leftSidePixels) {
                    safelyMiddleOfLanePerc = 0;
                    this.x = boundaries.leftSidePixels;
                }
            }
            else {
                distFromMiddle = Math.abs(0.25 - this.lanePerc) * 4;
                safelyMiddleOfLanePerc = 1 - distFromMiddle * distFromMiddle * distFromMiddle;
                if (this.x < middleOfRoad - carCenterMarginToRoadMedian) {
                    safelyMiddleOfLanePerc = 0;
                    this.x = middleOfRoad - carCenterMarginToRoadMedian;
                }

                if (this.x > boundaries.rightSidePixels) {
                    safelyMiddleOfLanePerc = 0;
                    this.x = boundaries.rightSidePixels;
                }
            }
            var distForMaxTurn = 5 + 15 * safelyMiddleOfLanePerc;
            var distToTarget = this.targetX - this.x;
            var turnPerc = distToTarget / distForMaxTurn;

            if (turnPerc < -1) {
                turnPerc = -1;
            }
            else if (turnPerc > 1) {
                turnPerc = 1;
            }

            this.x += LANE_CHANGE_SPEED * turnPerc;
            this.angle += LANE_CHANGE_ANG * turnPerc;

            /*if (this.x < this.targetX) {
                this.x += LANE_CHANGE_SPEED;
                this.angle += LANE_CHANGE_ANG;
            }

            if (this.x > this.targetX) {
                this.x -= LANE_CHANGE_SPEED;
                this.angle -= LANE_CHANGE_ANG;
            }*/
        } else if (this.steeringOverrideDir < 0) {
                this.x -= LANE_CHANGE_SPEED * COLLISION_EFFECT_MULT;
                this.angle -= LANE_CHANGE_ANG * COLLISION_EFFECT_MULT;
        } else {
                this.x += LANE_CHANGE_SPEED * COLLISION_EFFECT_MULT;
                this.angle += LANE_CHANGE_ANG * COLLISION_EFFECT_MULT;
        }

        this.steeringOverrideTimer--;

        if (this.steeringOverrideTimer < 0) {
            this.steeringOverrideDir = 0;
        }

        if (this.x < boundaries.leftSidePixels) {
            this.x = boundaries.leftSidePixels;
        }

        if (this.x > boundaries.rightSidePixels) {
            this.x = boundaries.rightSidePixels;
        }

        this.framesTillLaneSwitch--;

        if (this.framesTillLaneSwitch < 0 && this.steeringOverrideDir == 0) {
            if (this.goingSouth) {
                if (this.lanePerc > 0.7) {
                    this.lanePerc = 0.625;
                }
                else {
                    this.lanePerc = 0.875;
                }
            }else {
                if (this.lanePerc < 1.0 - 0.7) {
                    this.lanePerc = 1.0 - 0.625;
                }
                else {
                    this.lanePerc = 1.0 - 0.875;
                }
            }

            var laneChangeRange = (stageTuning[stageNow].framesTillTrafficCarsLaneChangeMax - stageTuning[stageNow].framesTillTrafficCarsLaneChangeMin);

            this.framesTillLaneSwitch = Math.random() * laneChangeRange + stageTuning[stageNow].framesTillTrafficCarsLaneChangeMin;
            this.speed += randomInRange(-TRAFFIC_CAR_SPEED_MAX_DELTA, TRAFFIC_CAR_SPEED_MAX_DELTA);

            if (this.speed < TRAFFIC_CAR_MIN_SPEED) {
                this.speed = TRAFFIC_CAR_MIN_SPEED;
            }

            if (this.speed > TRAFFIC_CAR_MAX_SPEED) {
                this.speed = TRAFFIC_CAR_MAX_SPEED; 
            }
        }
    };

    this.draw = function() {
        //colorRect(this.x - 5, this.y - 5, 10, 10, "yellow");
        //colorCircle(this.targetX, this.y, 5, "#ff7f00");
        canvasContext.save();
        canvasContext.translate(this.x, this.y);

        if (this.goingSouth)
        {
            canvasContext.rotate(- this.angle);
        } else {
            canvasContext.rotate(this.angle);
        }
        //canvasContext.translate(-vectorWid / 2, -vectorHei / 2);
        canvasContext.beginPath();
        canvasContext.moveTo(trafficCarPoints[0].x, trafficCarPoints[0].y);
        
        for (var i = 1; i < trafficCarPoints.length; i++) {
            canvasContext.lineTo(trafficCarPoints[i].x, trafficCarPoints[i].y);
        }

        if (this.framesTillLaneSwitch < FRAMES_TILL_TURNING_TO_BLINK && this.framesTillLaneSwitch % 4 < 2) {
            canvasContext.strokeStyle = "red";


        } else switch (this.gotScored){
            case CAR_PASS_SOUTHBOUND_GOT_SCORED_FAR:
                canvasContext.strokeStyle = "red";
                break;
            case CAR_PASS_SOUTHBOUND_GOT_SCORED_MED:
                canvasContext.strokeStyle = "yellow";
                break;
            case CAR_PASS_SOUTHBOUND_GOT_SCORED_NEAR:
                canvasContext.strokeStyle = "green";
                break;
            case CAR_PASS_NOT_SCORED:
                canvasContext.strokeStyle = "white";
                break;
            case CAR_PASS_NORTHBOUND_GOT_SCORED_NEAR:
                canvasContext.strokeStyle = "green";
                break;
            case CAR_PASS_NORTHBOUND_GOT_SCORED_MED:
                canvasContext.strokeStyle = "yellow";
                break;
            case CAR_PASS_NORTHBOUND_GOT_SCORED_FAR:
                canvasContext.strokeStyle = "red";
                break;
        }

        canvasContext.stroke();
        canvasContext.restore();
    }
}