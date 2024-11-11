// ==UserScript==
// @name         Slither.io-bot AStar
// @namespace    http://slither.io/
// @version      0.9.8
// @description  Slither.io bot AStar
// @author       JoeOfTex
// @match        http://slither.io/
// @grant        none
// ==/UserScript==

var collisionHelper = (function () {
    return {
        unitTable: [],
        toRad: 0,
        toDeg: 0,

        init: function () {
            collisionHelper.toRad = Math.PI / 180;
            collisionHelper.toDeg = 180 / Math.PI;
            collisionHelper.generateUnitTable();
        },

        /**
         *  Build the unit table for X,Y unit vectors for 0 to 360 degrees
         *
         */
        generateUnitTable: function () {
            var offset = 0;
            for (var a = 0; a < 360; a++) {
                var angle = collisionHelper.toRad * offset;
                collisionHelper.unitTable.push([
                    Math.cos(angle),
                    Math.sin(angle),
                    offset,
                    angle,
                ]);
                offset++;
            }
        },

        predictSnake: function (snk) {},

        /**
         * Performs line scans in angleIncrements to a specified distance
         * @param int angleIncrement
         * @param float scanDistance
         * @return object {
         *      int pct - percentage of open radar lines
         *      [[]] open - array with arrays of open lines that are neighbors in angle increment
         *      [] collisions - array of lines that collided with snakes
         *      [] results - array of all the lines
         *      float degrees - the angle of the line in degrees
         *      float radians - the angle of the line in radians
         * }
         *
         * line {
         *      int col - the column line finished/hit at
         *      int row - the row line finished/hit at
         *      object cell - the cell that was hit
         * }
         }
         */
        radarScan: function (angleIncrement, scanDist) {
            var results = [];
            var collisions = [];
            var open = [];
            var curpos = window.getPos();
            var openGroup = [];
            var openCnt = 0;

            var direction, dir, x2, y2, result, dist;
            var canvasPosA, canvasPosB, color;
            var linePos = 0;
            for (
                dir = 0;
                dir < collisionHelper.unitTable.length;
                dir += angleIncrement
            ) {
                direction = collisionHelper.unitTable[dir];
                x2 = curpos.x + direction[0] * scanDist;
                y2 = curpos.y + direction[1] * scanDist;

                result = collisionGrid.lineTest(
                    curpos.x,
                    curpos.y,
                    x2,
                    y2,
                    TYPE_SNAKE
                );
                if (result) results.push(result);

                linePos = 0;
                if (result.node) {
                    //if( result.col === undefined || result.row == undefined )
                    //    console.log("col/row undefined -- "+JSON.stringify(result));
                    linePos = collisionGrid.getCellByColRow(
                        result.col,
                        result.row
                    );
                    dist = canvas.getDistance2(
                        curpos.x,
                        curpos.y,
                        linePos.x,
                        linePos.y
                    );
                    collisions.push({ dist: dist, line: result });
                    if (openGroup.length) {
                        open.push(openGroup);
                        openGroup = [];
                    }
                } else {
                    //open.push(result);
                    openGroup.push(result);
                    openCnt++;
                }

                if (window.visualDebugging && linePos != 0) {
                    canvasPosA = canvas.mapToCanvas({
                        x: curpos.x,
                        y: curpos.y,
                        radius: 1,
                    });
                    canvasPosB = canvas.mapToCanvas({
                        x: linePos.x,
                        y: linePos.y,
                        radius: 1,
                    });

                    color =
                        !result.node || result.node.type == TYPE_EMPTY
                            ? "green"
                            : result.node.type == TYPE_FOOD
                            ? "blue"
                            : "red";
                    if (color != "green")
                        canvas.drawLine2(
                            canvasPosA.x,
                            canvasPosA.y,
                            canvasPosB.x,
                            canvasPosB.y,
                            1,
                            color
                        );
                }
            }

            if (openGroup.length) {
                open.push(openGroup);
            }

            open.sort(function (a, b) {
                return b.length - a.length;
            });

            if (collisions.length)
                collisions.sort(function (a, b) {
                    return a.dist - b.dist;
                });

            var pct = 0.0;
            if (results.length) pct = openCnt / results.length;

            return {
                pct: pct,
                open: open,
                collisions: collisions,
                results: results,
                degrees: direction[2],
                radians: direction[3],
            };
        },

        /**
         *  Check if two lines intersect.  Returns intersection point and if line segments are touching
         */
        checkLineIntersection: function (
            line1StartX,
            line1StartY,
            line1EndX,
            line1EndY,
            line2StartX,
            line2StartY,
            line2EndX,
            line2EndY
        ) {
            // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
            var denominator;
            var a;
            var b;
            var numerator1;
            var numerator2;
            var result = {
                x: null,
                y: null,
                onLine1: false,
                onLine2: false,
            };
            denominator =
                (line2EndY - line2StartY) * (line1EndX - line1StartX) -
                (line2EndX - line2StartX) * (line1EndY - line1StartY);
            if (denominator == 0) {
                return result;
            }
            a = line1StartY - line2StartY;
            b = line1StartX - line2StartX;
            numerator1 =
                (line2EndX - line2StartX) * a - (line2EndY - line2StartY) * b;
            numerator2 =
                (line1EndX - line1StartX) * a - (line1EndY - line1StartY) * b;
            a = numerator1 / denominator;
            b = numerator2 / denominator;

            // if we cast these lines infinitely in both directions, they intersect here:
            result.x = line1StartX + a * (line1EndX - line1StartX);
            result.y = line1StartY + a * (line1EndY - line1StartY);
            /*
            // it is worth noting that this should be the same as:
            x = line2StartX + (b * (line2EndX - line2StartX));
            y = line2StartX + (b * (line2EndY - line2StartY));
            */
            // if line1 is a segment and line2 is infinite, they intersect if:
            if (a > 0 && a < 1) {
                result.onLine1 = true;
            }
            // if line2 is a segment and line1 is infinite, they intersect if:
            if (b > 0 && b < 1) {
                result.onLine2 = true;
            }
            // if line1 and line2 are segments, they intersect if both of the above are true
            return result;
        },

        gridLineAntiAlias: function (x0, y0, x1, y1, wd, cellData) {
            var dx = Math.abs(x1 - x0),
                sx = x0 < x1 ? 1 : -1;
            var dy = Math.abs(y1 - y0),
                sy = y0 < y1 ? 1 : -1;
            var err = dx - dy,
                e2,
                x2,
                y2; /* error value e_xy */
            var ed = dx + dy == 0 ? 1 : Math.sqrt(dx * dx + dy * dy);
            var node = 0;
            for (wd = (wd + 1) / 2; ; ) {
                /* pixel loop */
                if (
                    !(
                        x0 < 0 ||
                        x0 > collisionGrid.gridWidth - 1 ||
                        y0 < 0 ||
                        y0 > collisionGrid.gridHeight - 1
                    )
                ) {
                    node = collisionGrid.getCell(x0, y0);
                    collisionGrid.markCellWall(
                        node,
                        window.botsettings.astarSnakeMaxWeight *
                            Math.max(0, Math.abs(err - dx + dy) / ed - wd + 1),
                        cellData
                    );
                }

                //setPixelColor(x0,y0,max(0,);

                e2 = err;
                x2 = x0;

                if (2 * e2 >= -dx) {
                    /* x step */
                    for (
                        e2 += dy, y2 = y0;
                        e2 < ed * wd && (y1 != y2 || dx > dy);
                        e2 += dx
                    ) {
                        y2 += sy;
                        if (
                            !(
                                x0 < 0 ||
                                x0 > collisionGrid.gridWidth - 1 ||
                                y2 < 0 ||
                                y2 > collisionGrid.gridHeight - 1
                            )
                        ) {
                            node = collisionGrid.getCell(x0, y2);
                            collisionGrid.markCellWall(
                                node,
                                window.botsettings.astarSnakeMaxWeight *
                                    Math.max(0, Math.abs(e2) / ed - wd + 1),
                                cellData
                            );
                        }
                    }

                    if (x0 == x1) break;

                    e2 = err;
                    err -= dy;
                    x0 += sx;
                }

                if (2 * e2 <= dy) {
                    /* y step */
                    for (
                        e2 = dx - e2;
                        e2 < ed * wd && (x1 != x2 || dx < dy);
                        e2 += dy
                    ) {
                        x2 += sx;
                        if (
                            !(
                                x2 < 0 ||
                                x2 > collisionGrid.gridWidth - 1 ||
                                y0 < 0 ||
                                y0 > collisionGrid.gridHeight - 1
                            )
                        ) {
                            node = collisionGrid.getCell(x2, y0);
                            collisionGrid.markCellWall(
                                node,
                                window.botsettings.astarSnakeMaxWeight *
                                    Math.max(0, Math.abs(e2) / ed - wd + 1),
                                cellData
                            );
                        }
                    }

                    if (y0 == y1) break;

                    err += dx;
                    y0 += sy;
                }
            }
        },

        /**
         * modified Bresenham with optional overlap (esp. for drawThickLine())
         * Overlap draws additional pixel when changing minor direction - for standard bresenham overlap = LINE_OVERLAP_NONE (0)
         *
         *  Sample line:
         *
         *    00+
         *     -0000+
         *         -0000+
         *             -00
         *
         *  0 pixels are drawn for normal line without any overlap
         *  + pixels are drawn if LINE_OVERLAP_MAJOR
         *  - pixels are drawn if LINE_OVERLAP_MINOR
         */
        /*
        drawLineOverlap: function(aXStart, aYStart, aXEnd, aYEnd, aOverlap, aColor) {
            var tDeltaX, tDeltaY, tDeltaXTimes2, tDeltaYTimes2, tError, tStepX, tStepY;


            if (aXStart >= collisionGrid.gridWidth) {
                aXStart = collisionGrid.gridWidth - 1;
            }
            if (aXStart < 0) {
                aXStart = 0;
            }
            if (aXEnd >= collisionGrid.gridWidth) {
                aXEnd = collisionGrid.gridWidth - 1;
            }
            if (aXEnd < 0) {
                aXEnd = 0;
            }
            if (aYStart >= collisionGrid.gridHeight) {
                aYStart = collisionGrid.gridHeight - 1;
            }
            if (aYStart < 0) {
                aYStart = 0;
            }
            if (aYEnd >= collisionGrid.gridHeight) {
                aYEnd = collisionGrid.gridHeight - 1;
            }
            if (aYEnd < 0) {
                aYEnd = 0;
            }

            if ((aXStart == aXEnd) || (aYStart == aYEnd)) {
                //horizontal or vertical line -> fillRect() is faster
                LocalDisplay.fillRect(aXStart, aYStart, aXEnd, aYEnd, aColor);
            } else {
                //calculate direction
                tDeltaX = aXEnd - aXStart;
                tDeltaY = aYEnd - aYStart;
                if (tDeltaX < 0) {
                    tDeltaX = -tDeltaX;
                    tStepX = -1;
                } else {
                    tStepX = +1;
                }
                if (tDeltaY < 0) {
                    tDeltaY = -tDeltaY;
                    tStepY = -1;
                } else {
                    tStepY = +1;
                }
                tDeltaXTimes2 = tDeltaX << 1;
                tDeltaYTimes2 = tDeltaY << 1;
                //draw start pixel
                LocalDisplay.drawPixel(aXStart, aYStart, aColor);
                if (tDeltaX > tDeltaY) {
                    // start value represents a half step in Y direction
                    tError = tDeltaYTimes2 - tDeltaX;
                    while (aXStart != aXEnd) {
                        // step in main direction
                        aXStart += tStepX;
                        if (tError >= 0) {
                            if (aOverlap & LINE_OVERLAP_MAJOR) {
                                // draw pixel in main direction before changing
                                LocalDisplay.drawPixel(aXStart, aYStart, aColor);
                            }
                            // change Y
                            aYStart += tStepY;
                            if (aOverlap & LINE_OVERLAP_MINOR) {
                                // draw pixel in minor direction before changing
                                LocalDisplay.drawPixel(aXStart - tStepX, aYStart, aColor);
                            }
                            tError -= tDeltaXTimes2;
                        }
                        tError += tDeltaYTimes2;
                        LocalDisplay.drawPixel(aXStart, aYStart, aColor);
                    }
                } else {
                    tError = tDeltaXTimes2 - tDeltaY;
                    while (aYStart != aYEnd) {
                        aYStart += tStepY;
                        if (tError >= 0) {
                            if (aOverlap & LINE_OVERLAP_MAJOR) {
                                // draw pixel in main direction before changing
                                LocalDisplay.drawPixel(aXStart, aYStart, aColor);
                            }
                            aXStart += tStepX;
                            if (aOverlap & LINE_OVERLAP_MINOR) {
                                // draw pixel in minor direction before changing
                                LocalDisplay.drawPixel(aXStart, aYStart - tStepY, aColor);
                            }
                            tError -= tDeltaYTimes2;
                        }
                        tError += tDeltaXTimes2;
                        LocalDisplay.drawPixel(aXStart, aYStart, aColor);
                    }
                }
            }
        },


        LINE_THICKNESS_MIDDLE: 0,                 // Start point is on the line at center of the thick line
        LINE_THICKNESS_DRAW_CLOCKWISE: 1,         // Start point is on the counter clockwise border line
        LINE_THICKNESS_DRAW_COUNTERCLOCKWISE: 2,  // Start point is on the clockwise border line


        drawThickLine: function(aXStart, aYStart, aXEnd, aYEnd, aThickness, aThicknessMode, aColor) {
            var i, tDeltaX, tDeltaY, tDeltaXTimes2, tDeltaYTimes2, tError, tStepX, tStepY;

            if (aThickness <= 1) {
                collisionHelper.drawLineOverlap(aXStart, aYStart, aXEnd, aYEnd, LINE_OVERLAP_NONE, aColor);
            }

            if (aXStart >= collisionGrid.gridWidth) {
                aXStart = collisionGrid.gridWidth - 1;
            }
            if (aXStart < 0) {
                aXStart = 0;
            }
            if (aXEnd >= collisionGrid.gridWidth) {
                aXEnd = collisionGrid.gridWidth - 1;
            }
            if (aXEnd < 0) {
                aXEnd = 0;
            }
            if (aYStart >= collisionGrid.gridHeight) {
                aYStart = collisionGrid.gridHeight - 1;
            }
            if (aYStart < 0) {
                aYStart = 0;
            }
            if (aYEnd >= collisionGrid.gridHeight) {
                aYEnd = collisionGrid.gridHeight - 1;
            }
            if (aYEnd < 0) {
                aYEnd = 0;
            }


            tDeltaY = aXEnd - aXStart;
            tDeltaX = aYEnd - aYStart;
            // mirror 4 quadrants to one and adjust deltas and stepping direction
            var tSwap = true; // count effective mirroring
            if (tDeltaX < 0) {
                tDeltaX = -tDeltaX;
                tStepX = -1;
                tSwap = !tSwap;
            } else {
                tStepX = +1;
            }
            if (tDeltaY < 0) {
                tDeltaY = -tDeltaY;
                tStepY = -1;
                tSwap = !tSwap;
            } else {
                tStepY = +1;
            }
            tDeltaXTimes2 = tDeltaX << 1;
            tDeltaYTimes2 = tDeltaY << 1;
            var tOverlap;
            // adjust for right direction of thickness from line origin
            var tDrawStartAdjustCount = aThickness / 2;
            if (aThicknessMode == collisionHelper.LINE_THICKNESS_DRAW_COUNTERCLOCKWISE) {
                tDrawStartAdjustCount = aThickness - 1;
            } else if (aThicknessMode == collisionHelper.LINE_THICKNESS_DRAW_CLOCKWISE) {
                tDrawStartAdjustCount = 0;
            }

            // which octant are we now
            if (tDeltaX >= tDeltaY) {
                if (tSwap) {
                    tDrawStartAdjustCount = (aThickness - 1) - tDrawStartAdjustCount;
                    tStepY = -tStepY;
                } else {
                    tStepX = -tStepX;
                }

                // adjust draw start point
                tError = tDeltaYTimes2 - tDeltaX;
                for (i = tDrawStartAdjustCount; i > 0; i--) {
                    // change X (main direction here)
                    aXStart -= tStepX;
                    aXEnd -= tStepX;
                    if (tError >= 0) {
                        // change Y
                        aYStart -= tStepY;
                        aYEnd -= tStepY;
                        tError -= tDeltaXTimes2;
                    }
                    tError += tDeltaYTimes2;
                }

                //draw start line
                LocalDisplay.drawLine(aXStart, aYStart, aXEnd, aYEnd, aColor);

                // draw aThickness lines
                tError = tDeltaYTimes2 - tDeltaX;
                for (i = aThickness; i > 1; i--) {
                    // change X (main direction here)
                    aXStart += tStepX;
                    aXEnd += tStepX;
                    tOverlap = LINE_OVERLAP_NONE;
                    if (tError >= 0) {
                        // change Y
                        aYStart += tStepY;
                        aYEnd += tStepY;
                        tError -= tDeltaXTimes2;

                        tOverlap = LINE_OVERLAP_MAJOR;
                    }
                    tError += tDeltaYTimes2;
                    drawLineOverlap(aXStart, aYStart, aXEnd, aYEnd, tOverlap, aColor);
                }
            } else {
                // the other octant
                if (tSwap) {
                    tStepX = -tStepX;
                } else {
                    tDrawStartAdjustCount = (aThickness - 1) - tDrawStartAdjustCount;
                    tStepY = -tStepY;
                }
                // adjust draw start point
                tError = tDeltaXTimes2 - tDeltaY;
                for (i = tDrawStartAdjustCount; i > 0; i--) {
                    aYStart -= tStepY;
                    aYEnd -= tStepY;
                    if (tError >= 0) {
                        aXStart -= tStepX;
                        aXEnd -= tStepX;
                        tError -= tDeltaYTimes2;
                    }
                    tError += tDeltaXTimes2;
                }
                //draw start line
                LocalDisplay.drawLine(aXStart, aYStart, aXEnd, aYEnd, aColor);
                tError = tDeltaXTimes2 - tDeltaY;
                for (i = aThickness; i > 1; i--) {
                    aYStart += tStepY;
                    aYEnd += tStepY;
                    tOverlap = LINE_OVERLAP_NONE;
                    if (tError >= 0) {
                        aXStart += tStepX;
                        aXEnd += tStepX;
                        tError -= tDeltaYTimes2;
                        tOverlap = LINE_OVERLAP_MAJOR;
                    }
                    tError += tDeltaXTimes2;
                    drawLineOverlap(aXStart, aYStart, aXEnd, aYEnd, tOverlap, aColor);
                }
            }
        }*/
    };
})();

/**
 * A 2d collision grid system for fast line to box collision
 *
 * - Flagged cells are occupied by object(s)
 * - Non-flagged cells are empty
 * - Cells are world space cut up into squares of X size
 */
var collisionGrid = (function () {
    collisionHelper.init();

    return {
        //track version (used to avoid recreating array)
        version: 0,

        width: 0,
        height: 0,
        grid: [],
        cellSize: 20,
        halfCellSize: 10,
        startX: 0,
        startY: 0,
        gridWidth: 0,
        gridHeight: 0,
        endX: 0,
        endY: 0,
        foodGroups: [],
        snakeAggressors: [],

        //Initialize the default fields.  This should only be done once per game.
        init: function (w, h, cellsz) {
            collisionGrid.version = 0;
            collisionGrid.height = h * cellsz;
            collisionGrid.width = w * cellsz;
            collisionGrid.gridWidth = w;
            collisionGrid.gridHeight = h;
            collisionGrid.cellSize = cellsz;
            collisionGrid.halfCellSize = cellsz / 2;

            collisionGrid.grid = [];
            for (var col = 0; col < w; col++) {
                collisionGrid.grid[col] = [];
                for (var row = 0; row < h; row++) {
                    collisionGrid.grid[col][row] = new GridNode(
                        col,
                        row,
                        window.botsettings.astarEmptyWeight,
                        TYPE_EMPTY
                    );
                }
            }
        },

        //Setup grid to be relative to the player's position
        //Then add all the entities to the grid
        setup: function () {
            collisionGrid.version++;
            sx = Math.floor(window.getX());
            sy = Math.floor(window.getY());
            sx = sx - (sx % collisionGrid.cellSize);
            sy = sy - (sy % collisionGrid.cellSize);

            collisionGrid.startX = Math.floor(
                sx - (collisionGrid.gridWidth / 2) * collisionGrid.cellSize
            );
            collisionGrid.startY = Math.floor(
                sy - (collisionGrid.gridHeight / 2) * collisionGrid.cellSize
            );
            collisionGrid.endX = collisionGrid.startX + collisionGrid.width;
            collisionGrid.endY = collisionGrid.startY + collisionGrid.height;

            collisionGrid.addSnakes();
            collisionGrid.addFood();

            bot.radarResults = collisionHelper.radarScan(
                window.botsettings.radarAngleIncrement,
                window.botsettings.radarDistance
            );
        },

        // Slice out a portion of the grid for less calculations
        // callback = function(x, y, gridValue) {}
        sliceGrid: function (col, row, width, height, callback) {
            //constrain the values between 0 and width/height
            col = Math.min(Math.max(col, 0), collisionGrid.gridWidth - 1);
            row = Math.min(Math.max(row, 0), collisionGrid.gridHeight - 1);
            width = col + width;
            height = row + height;
            width = Math.min(collisionGrid.gridWidth - 1, Math.max(width, 0));
            height = Math.min(
                collisionGrid.gridHeight - 1,
                Math.max(height, 0)
            );
            for (var x = col; x <= width; x++) {
                for (var y = row; y <= height; y++) {
                    callback(x, y, collisionGrid.getCell(x, y));
                }
            }
        },

        getCellColRow: function (x, y) {
            x = x - collisionGrid.startX;
            y = y - collisionGrid.startY;
            col = Math.floor(x / collisionGrid.cellSize);
            row = Math.floor(y / collisionGrid.cellSize);
            col = Math.min(Math.max(col, 0), collisionGrid.gridWidth - 1);
            row = Math.min(Math.max(row, 0), collisionGrid.gridHeight - 1);
            return { col: col, row: row };
        },
        // Find specific cell's column and row using map-space position
        getCellByXY: function (x, y) {
            x = x - collisionGrid.startX;
            y = y - collisionGrid.startY;
            col = Math.floor(x / collisionGrid.cellSize);
            row = Math.floor(y / collisionGrid.cellSize);
            col = Math.min(Math.max(col, 0), collisionGrid.gridWidth - 1);
            row = Math.min(Math.max(row, 0), collisionGrid.gridHeight - 1);
            return {
                col: col,
                row: row,
                node: collisionGrid.getCell(col, row),
            };
        },

        // Get cell's map-space position at top left corner of cell
        getCellByColRow: function (col, row) {
            var x =
                collisionGrid.startX +
                col * collisionGrid.cellSize +
                collisionGrid.halfCellSize;
            var y =
                collisionGrid.startY +
                row * collisionGrid.cellSize +
                collisionGrid.halfCellSize;
            return { x: x, y: y, node: collisionGrid.getCell(col, row) };
        },

        // This is used to convert a width or height to the amount of cells it would occupy
        calculateMaxCellCount: function (sz) {
            return Math.floor(sz / collisionGrid.cellSize);
        },

        // set cell size
        setCellSize: function (sz) {
            collisionGrid.cellSize = sz;
        },

        getCell: function (col, row) {
            var cell = collisionGrid.grid[col][row];
            if (cell.version != collisionGrid.version) {
                cell.reset(collisionGrid.version);
            }
            return cell;
        },

        cellTest: function (col, row, type) {
            node = collisionGrid.getCell(col, row); // first point
            if (node.type == type) return node;
            return false;
        },

        markCell: function (col, row, weight, type) {
            var node = collisionGrid.getCell(col, row);
            node.type = type;
            node.weight = weight;
            return node;
        },

        markCellWall: function (node, weight, obj) {
            //var node = collisionGrid.markCell(col, row, 0, TYPE_SNAKE);
            node.type = TYPE_SNAKE;
            node.weight += weight;
            node.items.push(obj);
            //if( window.gridDebugging )// && node.items.length == 1 )
            //    collisionGrid.drawCell(node.x,node.y,'rgba(0,255,255,'+(1.0-(weight/window.botsettings.astarSnakeMaxWeight))+')');
            return node;
        },

        markCellEmpty: function (node, weight) {
            weight = weight || window.botsettings.astarEmptyWeight;
            node.type = TYPE_EMPTY;
            node.weight = weight;
            //var node = collisionGrid.markCell(col, row, weight, TYPE_EMPTY);
            return node;
        },

        markCellFood: function (node, food) {
            node.type = TYPE_FOOD;
            node.weight =
                food.sz * window.botsettings.astarFoodWeightMultiplier;
            //var node = collisionGrid.markCell(col, row, food.sz, TYPE_FOOD);
            node.items.push(food);
            return node;
        },

        isWall: function (col, row) {
            return collisionGrid.getCell(col, row).type == TYPE_SNAKE;
        },

        isEmpty: function (col, row) {
            return collisionGrid.getCell(col, row).type == TYPE_EMPTY;
        },

        drawCell: function (col, row, color) {
            if (!window.visualDebugging) return;

            color = color || "rgba(255,255,0,0.25)";
            var pos = collisionGrid.getCellByColRow(col, row);
            var canvasPos = canvas.mapToCanvas({
                x: pos.x - collisionGrid.halfCellSize,
                y: pos.y - collisionGrid.halfCellSize,
            });

            canvas.drawRect(
                canvasPos.x,
                canvasPos.y,
                collisionGrid.cellSize * canvas.getScale(),
                collisionGrid.cellSize * canvas.getScale(),
                color
            );
        },

        drawSubGrid: function (startCol, startRow, endCol, endRow, color) {
            if (!window.gridDebugging) return;

            startCol = Math.min(
                Math.max(startCol, 0),
                collisionGrid.gridWidth - 1
            );
            startRow = Math.min(
                Math.max(startRow, 0),
                collisionGrid.gridHeight - 1
            );

            endCol = Math.min(Math.max(endCol, 0), collisionGrid.gridWidth - 1);
            endRow = Math.min(
                Math.max(endRow, 0),
                collisionGrid.gridHeight - 1
            );

            color = color || "rgba(255,255,0,0.25)";
            var pos = collisionGrid.getCellByColRow(startCol, startRow);
            var canvasPos = canvas.mapToCanvas({
                x: pos.x - collisionGrid.halfCellSize,
                y: pos.y - collisionGrid.halfCellSize,
            });

            var pos2 = collisionGrid.getCellByColRow(endCol, endRow);

            //var canvasPos2 = canvas.mapToCanvas({
            //    x: pos2.x+collisionGrid.halfCellSize,
            //    y: pos2.y+collisionGrid.halfCellSize
            //});

            canvas.drawRect(
                canvasPos.x,
                canvasPos.y,
                Math.abs(pos2.x - pos.x) * canvas.getScale(),
                Math.abs(pos2.y - pos.y) * canvas.getScale(),
                color
            );
        },

        addNeighbor: function (x, y, arr) {
            if (
                x < 0 ||
                x >= collisionGrid.gridWidth ||
                y < 0 ||
                y >= collisionGrid.gridHeight
            )
                return;
            var node = collisionGrid.getCell(x, y);
            //if( node.type == TYPE_SNAKE )
            //    return;

            arr.push(node);
        },

        neighbors: function (x, y) {
            var ret = [];
            collisionGrid.addNeighbor(x - 1, y, ret); //West
            collisionGrid.addNeighbor(x + 1, y, ret); //East
            collisionGrid.addNeighbor(x, y - 1, ret); //South
            collisionGrid.addNeighbor(x, y + 1, ret); //North
            collisionGrid.addNeighbor(x - 1, y - 1, ret); // Southwest
            collisionGrid.addNeighbor(x + 1, y - 1, ret); // Southeast
            collisionGrid.addNeighbor(x - 1, y + 1, ret); // Northwest
            collisionGrid.addNeighbor(x + 1, y + 1, ret); // Northeast
            return ret;
        },

        generatePath: function (startX, startY, endX, endY) {
            var startCell = collisionGrid.getCellByXY(startX, startY);
            var endCell = collisionGrid.getCellByXY(endX, endY);
            var start = collisionGrid.getCell(startCell.col, startCell.row);
            var end = collisionGrid.getCell(endCell.col, endCell.row);
            var path = astar.search(start, end);
            return path;
        },

        addFood: function () {
            collisionGrid.foodGroups = [];
            foodHighQuality = [];
            var foodGroupIDs = {};
            var foodGridSize = window.botsettings.foodGridSize;
            var foodCellSize = window.botsettings.foodCellSize;
            var foodCellSizeHalf = foodCellSize / 2;
            var curpos = window.getPos();
            var center = collisionGrid.getCellByXY(curpos.x, curpos.y);
            curpos.x = Math.floor(curpos.x);
            curpos.y = Math.floor(curpos.y);
            curpos.x = curpos.x - (curpos.x % foodCellSize);
            curpos.y = curpos.y - (curpos.y % foodCellSize);
            var startX = Math.floor(
                curpos.x - (foodGridSize / 2) * foodCellSize
            );
            var startY = Math.floor(
                curpos.y - (foodGridSize / 2) * foodCellSize
            );
            var endX = startX + foodGridSize * foodCellSize;
            var endY = startY + foodGridSize * foodCellSize;
            var x, y, col, row;
            var food, cell, node, distance2;
            var i, id, groupid, group;
            var dot;

            for (i = 0; i < window.foods.length; i++) {
                food = window.foods[i];
                if (food === null || food === undefined || food.eaten) continue;

                if (
                    food.xx < startX ||
                    food.xx > endX ||
                    food.yy < startY ||
                    food.yy > endY
                )
                    continue;

                x = food.xx - startX;
                y = food.yy - startY;
                col = Math.round(x / foodCellSize);
                row = Math.round(y / foodCellSize);
                col = Math.min(Math.max(col, 0), foodGridSize);
                row = Math.min(Math.max(row, 0), foodGridSize);

                cell = collisionGrid.getCellByXY(food.xx, food.yy);
                if (cell.node.type == TYPE_SNAKE) continue;

                node = collisionGrid.markCellFood(cell.node, food);
                if (node) {
                    distance2 = canvas.getDistance2(
                        food.xx,
                        food.yy,
                        curpos.x,
                        curpos.y
                    );
                    food.distance2 = distance2;
                    id = col + "," + row;
                    groupid = foodGroupIDs[id] || 0;

                    if (!groupid) groupid = collisionGrid.foodGroups.length;

                    group = collisionGrid.foodGroups[groupid] || 0;
                    if (!group)
                        group = {
                            sumx: 0,
                            sumy: 0,
                            nodes: [],
                            col: 0,
                            row: 0,
                            score: 0,
                            maxfood: 0,
                            distance2: -1,
                        };

                    group.nodes.push({
                        x: food.xx,
                        y: food.yy,
                        distance2: distance2,
                        node: node,
                    });
                    group.sumx += food.xx;
                    group.sumy += food.yy;
                    group.score += Math.round(food.sz);
                    group.maxfood = food;
                    group.col = col;
                    group.row = row;

                    if (!group.maxfood || food.sz > group.maxfood.sz) {
                        group.maxfood = food.sz;
                    }

                    if (group.distance2 == -1 || distance2 > group.distance2)
                        group.distance2 = distance2;

                    collisionGrid.foodGroups[groupid] = group;
                    foodGroupIDs[id] = groupid;
                }
            }

            var tempGroup = [];
            for (var i = 0; i < collisionGrid.foodGroups.length; i++) {
                var foodgroup = collisionGrid.foodGroups[i];
                if (
                    foodgroup.score >= window.botsettings.foodHighQualityScore
                ) {
                    foodHighQuality.push(foodgroup);
                } else {
                    var food = foodgroup.nodes[0];
                    //var relv = {x: curpos.x - food.x, y: curpos.y-food.y};

                    var v = canvas.getRelativeAngle(curpos, food); //{x:food.xx, y:food.yy});

                    if (v.dot < window.botsettings.foodIgnoreAngle) continue;

                    tempGroup.push(foodgroup);
                }
            }

            if (window.visualDebugging) {
                var halfFoodCellSize = (foodCellSize * canvas.getScale()) / 2;
                for (var i = 0; i < collisionGrid.foodGroups.length; i++) {
                    var foodgroup = collisionGrid.foodGroups[i];
                    var foodcnt = foodgroup.nodes.length;
                    //foodPos = {x: foodgroup.sumx / foodcnt, y:foodgroup.sumy / foodcnt};
                    for (var j = 0; j < foodgroup.nodes.length; j++) {
                        var foodpos = {
                            x: foodgroup.nodes[j].x,
                            y: foodgroup.nodes[j].y,
                        };
                        var canvasFoodPos = canvas.mapToCanvas(foodpos);
                    }
                    var mapPos = {
                        x: startX + foodgroup.col * foodCellSize,
                        y: startY + foodgroup.row * foodCellSize,
                    };
                    var canvasPos = canvas.mapToCanvas(mapPos);
                    /*canvas.drawRect(
                        canvasPos.x,
                        canvasPos.y,
                        foodCellSize * canvas.getScale(),
                        foodCellSize * canvas.getScale(),
                        'rgba(0,255,0,0.25)');*/

                    canvas.drawText(canvasPos, "white", foodgroup.score);
                    //console.log("FoodGroup("+foodgroup.col+","+foodgroup.row+") = " + collisionGrid.foodGroups[groupid].score);
                }
            }

            foodHighQuality.sort(function (a, b) {
                //return ((b.score * b.score) / b.distance) - ((a.score * a.score) / a.distance);
                return b.score - a.score;
                //return b.distance - a.distance;//(a.score == b.score ? 0 : (a.score / a.distance) > (b.score / b.distance)  ? -1 : 1);
            });

            tempGroup.sort(function (a, b) {
                return b.score - a.score;
                // return ((b.score * b.score) / b.distance) - ((a.score * a.score) / a.distance);
                //return b.distance - a.distance;//(a.score == b.score ? 0 : (a.score / a.distance) > (b.score / b.distance)  ? -1 : 1);
            });

            collisionGrid.foodGroups = foodHighQuality.concat(tempGroup);
        },

        // add all snake's collision parts to the grid
        addSnakes: function () {
            collisionGrid.snakeAggressors = [];

            var myX = window.getX();
            var myY = window.getY();

            var lastAlive = 0;
            var deadCount = 0;
            var maxDeadCount = 2;
            var pts, pts2, part, threat;
            var snk, cnt, relPos, snakeDist, rang;
            var snkWidthSqr = window.getSnakeWidthSqr();
            var otherSnkWidthSqr;
            var otherSnkWidth;
            var otherSnkWidth2;

            window.slither.snkWidth = window.getSnakeWidth();
            window.slither.snkWidth2 = window.slither.snkWidth * 2;
            window.slither.snkWidthSqr = window.getSnakeWidthSqr();

            for (snakeid in window.slithers) {
                snk = window.slithers[snakeid];
                if (snk.id == window.slither.id) continue;
                cnt = 0;

                //save the closest part of this snake
                snk.closest = 0;
                snk.snkWidth = window.getSnakeWidth(snk);
                snk.snkWidth2 = window.slither.snkWidth * 2;
                snk.snkWidthSqr = window.getSnakeWidthSqr(snk);

                //save the snake head directional information
                // to be used for prediction
                relPos = { x: myX - snk.xx, y: myY - snk.yy };
                snakeDist = canvas.getDistance2(myX, myY, snk.xx, snk.yy);
                rang = snk.ang; // * collisionHelper.toRad;
                var aggressor = {
                    snk: snk,
                    distance2: snakeDist,
                    relativePos: relPos,
                    heading: { x: Math.cos(rang), y: Math.sin(rang) },
                };
                collisionGrid.snakeAggressors.push(aggressor);

                if (window.visualDebugging) {
                    canvasPosA = canvas.mapToCanvas({
                        x: snk.xx,
                        y: snk.yy,
                        radius: 1,
                    });
                    canvasPosB = canvas.mapToCanvas({
                        x: snk.xx + aggressor.heading.x * 100,
                        y: snk.yy + aggressor.heading.y * 100,
                        radius: 1,
                    });

                    canvas.drawLine2(
                        canvasPosA.x,
                        canvasPosA.y,
                        canvasPosB.x,
                        canvasPosB.y,
                        2,
                        "yellow"
                    );
                }

                //create collision for the snake head
                if (
                    snk.xx > collisionGrid.startX &&
                    snk.xx < collisionGrid.endX &&
                    snk.yy > collisionGrid.startY &&
                    snk.yy < collisionGrid.endY
                ) {
                    threat = collisionGrid.setupSnakeThreatRadius(
                        snk,
                        window.botsettings.collisionSnakeHeadSizeMultiplier
                    );
                    collisionGrid.snakePartBounds(snk, snk, threat);
                }

                //generate the radius for the snake part
                threat = collisionGrid.setupSnakeThreatRadius(
                    snk,
                    window.botsettings.collisionSnakePartSizeMultiplier
                );
                otherSnkWidthSqr = window.getSnakeWidthSqr(snk);
                otherSnkWidth = window.getSnakeWidth(snk.sc);
                otherSnkWidth2 = otherSnkWidth * 2;
                var radius =
                    collisionGrid.calculateMaxCellCount(otherSnkWidth) + 2;
                var lastpts = snk.pts.length - 1;
                var lastPos = 0;

                //add all the parts + some dying (behind snake)
                for (pts = lastpts; pts >= 3; pts -= 3) {
                    // in snk.pts) {
                    part = snk.pts[pts];
                    pts2 = pts - 3;
                    //part2 = snk.pts[pts2];

                    if (part.dying) {
                        if (deadCount++ > maxDeadCount) continue;
                    }
                    /*if (part2.dying) {
                        if( deadCount++ > maxDeadCount )
                            continue;
                    }
                    //if( part2 == null || typeof(part2) === 'undefined')
                    //    continue;*/
                    lastAlive = pts2;

                    part.pid = pts;
                    //part2.pid = pts2;
                    //only add parts that are within our grid bounds

                    if (
                        part.xx < collisionGrid.startX ||
                        part.xx > collisionGrid.endX ||
                        part.yy < collisionGrid.startY ||
                        part.yy > collisionGrid.endY
                    )
                        continue;

                    if (lastPos) {
                        var dist2 = canvas.getDistance2(
                            lastPos.x,
                            lastPos.y,
                            part.xx,
                            part.yy
                        );
                        if (dist2 > otherSnkWidthSqr * 40) {
                            //set the collision cells on the grid
                            collisionGrid.snakePartBounds(
                                snk,
                                part,
                                threat,
                                snkWidthSqr,
                                otherSnkWidthSqr
                            );

                            //find closest part
                            collisionGrid.findClosestPart(
                                snk,
                                part,
                                snkWidthSqr,
                                otherSnkWidthSqr
                            );

                            lastPos.x = part.xx;
                            lastPos.y = part.yy;
                        }
                        continue;
                    }

                    /*
                    //if( typeof part2 !== 'undefined')
                    {
                        canvas.drawCircle({x:part2.xx, y:part2.yy, radius:otherSnkWidth}, 'yellow', false);
                        var start = collisionGrid.getCellByXY(part.xx,part.yy);
                        var end = collisionGrid.getCellByXY(part2.xx,part2.yy);
                        var cellData = {snake:snk, part:part};
                        collisionHelper.gridLineAntiAlias(start.col, start.row, end.col, end.row, radius*2, cellData)
                    }*/

                    //set the collision cells on the grid
                    collisionGrid.snakePartBounds(
                        snk,
                        part,
                        threat,
                        snkWidthSqr,
                        otherSnkWidthSqr
                    );

                    //find closest part
                    collisionGrid.findClosestPart(
                        snk,
                        part,
                        snkWidthSqr,
                        otherSnkWidthSqr
                    );

                    //collisionGrid.findClosestPart(snk, part2, snkWidthSqr, otherSnkWidthSqr);
                    lastPos = { x: part.xx, y: part.yy };
                    //lastPos.x = part.xx;
                    //lastPos.y = part.yy;
                }

                //debugging
                if (window.visualDebugging && snk.closest) {
                    canvas.drawCircle(
                        {
                            x: snk.closest.xx,
                            y: snk.closest.yy,
                            radius: otherSnkWidth,
                        },
                        "orange",
                        false
                    );
                    canvas.drawCircle(
                        { x: snk.xx, y: snk.yy, radius: otherSnkWidth },
                        "red",
                        false
                    );
                }
            }

            //sort from closest to furthest
            collisionGrid.snakeAggressors.sort(function (a, b) {
                return a.distance2 - b.distance2;
            });
        },

        //save the snake's closest part that is to us
        findClosestPart: function (snk, part, snkWidthSqr, otherSnkWidthSqr) {
            var curpos = window.getPos();
            var dist2 = canvas.getDistance2(
                curpos.x,
                curpos.y,
                part.xx,
                part.yy
            );
            part.distance2 = dist2 - (snkWidthSqr + otherSnkWidthSqr);
            if (snk.closest == 0) {
                snk.closest = part;
                return;
            }
            if (dist2 < snk.closest.distance2) {
                snk.closest = part;
            }
        },

        //generate different radius for the snake
        setupSnakeThreatRadius: function (snk, sizemultiplier) {
            sizemultiplier =
                sizemultiplier ||
                window.botsettings.collisionSnakePartSizeMultiplier;
            threatLevels = {};
            threatLevels.radius = window.getSnakeWidth(snk.sc);
            if (snk.sp > 7) sizemultiplier *= 2;

            threatLevels.radius =
                Math.max(
                    threatLevels.radius,
                    window.botsettings.collisionSnakePartMinimumSize
                ) * sizemultiplier;
            threatLevels.t1 = collisionGrid.calculateMaxCellCount(
                threatLevels.radius
            );
            threatLevels.tt1 = threatLevels.t1 * 2;
            threatLevels.t2 = collisionGrid.calculateMaxCellCount(
                threatLevels.radius * 4
            );
            threatLevels.tt2 = threatLevels.t2 * 3;
            threatLevels.t3 = collisionGrid.calculateMaxCellCount(
                threatLevels.radius * 2
            );
            threatLevels.tt3 = threatLevels.t3 * 3;
            threatLevels.t4 = collisionGrid.calculateMaxCellCount(
                threatLevels.radius * 3
            );
            threatLevels.tt4 = threatLevels.t4 * 3;
            threatLevels.max = collisionGrid.calculateMaxCellCount(
                threatLevels.radius * 5
            );
            threatLevels.max2 = threatLevels.max * 3;
            return threatLevels;
        },

        snakePartBounds: function (
            snk,
            part,
            threatLevels,
            snkWidthSqr,
            otherSnkWidthSqr
        ) {
            //calculate grid width/height of a snake part
            var cellpos = collisionGrid.getCellColRow(part.xx, part.yy); //.getCellByXY(part.xx, part.yy);

            //mark surrounding cells using part's radius
            var maxthreat = threatLevels.t1;
            var maxthreat2 = threatLevels.tt1;

            //mark cell where part's center is located
            //collisionGrid.markCellWall(cell.col, cell.row, {snake:snk, part:part});
            //canvas.drawCircle(canvas.mapToCanvas({x:part.xx, y:part.yy}), 'red', true);
            //collisionGrid.drawSubGrid(cellpos.col-maxthreat, gcellpos.row-maxthreat, cellpos.col+maxthreat, cellpos.row+maxthreat, 'yellow');

            var maxdist = astar.heuristics.manhattan(
                { x: cellpos.col, y: cellpos.row },
                { x: cellpos.col - maxthreat, y: cellpos.row - maxthreat }
            );

            collisionGrid.sliceGrid(
                cellpos.col - maxthreat,
                cellpos.row - maxthreat,
                maxthreat2,
                maxthreat2,
                function (col, row, node) {
                    //if( node.type == TYPE_SNAKE )// || (val.type == TYPE_FOOD && val.weight > 1000))// || val.weight > 1000 )
                    //    return;

                    var dist2 = astar.heuristics.manhattan(
                        { x: cellpos.col, y: cellpos.row },
                        { x: col, y: row }
                    ); //canvas.getDistance2(cellpos.col, cellpos.row, col, row);

                    var cellData = { snake: snk, part: part };
                    var weight =
                        1 - Math.max(0.01, Math.min(1.0, dist2 / maxdist));
                    weight = weight * weight;
                    collisionGrid.markCellWall(
                        node,
                        window.botsettings.astarSnakeMaxWeight * weight,
                        cellData
                    );
                    if (window.gridDebugging)
                        collisionGrid.drawCell(
                            col,
                            row,
                            "rgba(0,255,255," + weight + ")"
                        );

                    /*
                    //collisionGrid.markCellWall(col, row, {snake:snk, part:part});
                    if( col >= (cellpos.col-threatLevels.t1) &&
                        col < (cellpos.col+threatLevels.t1) &&
                        row >= (cellpos.row-threatLevels.t1) &&
                        row < (cellpos.row+threatLevels.t1) ) {
                        var cellData = {snake:snk, part:part};
                        collisionGrid.markCellWall(node, cellData);
                        return;
                    }
                    //if( val.weight > 1000 ) return;
                    collisionGrid.markCellEmpty(node, 10000);*/
                    /*if( col >= (cellpos.col-threatLevels.t2) &&
                        col < (cellpos.col+threatLevels.t2) &&
                        row >= (cellpos.row-threatLevels.t2) &&
                        row < (cellpos.row+threatLevels.t2) ) {
                        collisionGrid.markCellEmpty(val, 10000)
                    }*/
                    /*else if( col >= (cell.col-threatLevels.t3) &&
                        col < (cell.col+threatLevels.tt3) &&
                        row >= (cell.row-threatLevels.t3)&&
                        row < (cell.row+threatLevels.tt3) ) {
                        collisionGrid.markCellEmpty(col, row, 10000)
                    }
                    else if( col >= (cell.col-threatLevels.t4) &&
                        col < (cell.col+threatLevels.tt4) &&
                        row >= (cell.row-threatLevels.t4) &&
                        row < (cell.row+threatLevels.tt4) ) {
                        collisionGrid.markCellEmpty(col, row, 10000)
                    }
                    else {
                        collisionGrid.markCellEmpty(col, row, 10000)
                    }*/
                }
            );
        },

        lineTestResult: 0,
        lineTypeCheck: function (col, row, type) {
            if (
                col >= collisionGrid.gridWidth ||
                row >= collisionGrid.gridHeight
            )
                return 0;
            var node = collisionGrid.cellTest(col, row, type);
            if (node !== false)
                collisionGrid.lineTestResult = {
                    col: col,
                    row: row,
                    node: node,
                };
            return collisionGrid.lineTestResult;
        },

        lineTest: function (x0, y0, x1, y1, type) {
            collisionGrid.lineTestResult = 0;
            var posA = collisionGrid.getCellByXY(x0, y0);
            var posB = collisionGrid.getCellByXY(x1, y1);
            x0 = posA.col;
            y0 = posA.row;
            x1 = posB.col;
            y1 = posB.row;
            var dx = Math.abs(x1 - x0);
            var sx = x0 < x1 ? 1 : -1;
            var dy = -Math.abs(y1 - y0);
            var sy = y0 < y1 ? 1 : -1;
            var err = dx + dy;
            var e2; // error value e_xy

            for (;;) {
                // loop
                //setPixel(x0,y0);
                if (collisionGrid.lineTypeCheck(x0, y0, type))
                    return collisionGrid.lineTestResult;
                if (x0 == x1 && y0 == y1) break;
                e2 = 2 * err;
                if (e2 >= dy) {
                    err += dy;
                    x0 += sx;
                } // e_xy+e_x > 0
                if (e2 <= dx) {
                    err += dx;
                    y0 += sy;
                } // e_xy+e_y < 0
            }

            return { col: x1, row: y1, cell: 0 };
        },

        lineTest2: function (x1, y1, x2, y2, type) {
            collisionGrid.lineTestResult = 0;
            var posA = collisionGrid.getCellByXY(x1, y1);
            var posB = collisionGrid.getCellByXY(x2, y2);
            (x1 = posA.col), (x2 = posB.col);
            (y1 = posA.row), (y2 = posB.row);
            var i; // loop counter
            var cell;
            var ystep, xstep; // the step on y and x axis
            var error; // the error accumulated during the increment
            var errorprev; // *vision the previous value of the error variable
            var y = y1,
                x = x1; // the line points
            var ddy, ddx; // compulsory variables: the double values of dy and dx
            var dx = x2 - x1;
            var dy = y2 - y1;

            if (collisionGrid.lineTypeCheck(x1, y1, type))
                return collisionGrid.lineTestResult;

            // NB the last point can't be here, because of its previous point (which has to be verified)
            if (dy < 0) {
                ystep = -1;
                dy = -dy;
            } else ystep = 1;

            if (dx < 0) {
                xstep = -1;
                dx = -dx;
            } else xstep = 1;

            ddy = 2 * dy; // work with double values for full precision
            ddx = 2 * dx;
            if (ddx >= ddy) {
                // first octant (0 <= slope <= 1)
                // compulsory initialization (even for errorprev, needed when dx==dy)
                errorprev = error = dx; // start in the middle of the square
                for (i = 0; i < dx; i++) {
                    // do not use the first point (already done)
                    x += xstep;
                    error += ddy;
                    if (error > ddx) {
                        // increment y if AFTER the middle ( > )
                        y += ystep;
                        error -= ddx;
                        // three cases (octant == right->right-top for directions below):
                        if (error + errorprev < ddx) {
                            // bottom square also
                            if (collisionGrid.lineTypeCheck(x, y - ystep, type))
                                return collisionGrid.lineTestResult;
                        } else if (error + errorprev > ddx) {
                            // left square also
                            if (collisionGrid.lineTypeCheck(x - xstep, y, type))
                                return collisionGrid.lineTestResult;
                        } else {
                            // corner: bottom and left squares also
                            if (collisionGrid.lineTypeCheck(x, y - ystep, type))
                                return collisionGrid.lineTestResult;
                            if (collisionGrid.lineTypeCheck(x - xstep, y, type))
                                return collisionGrid.lineTestResult;
                        }
                    }
                    if ((cell = collisionGrid.cellTest(x, y, type)) !== false)
                        return { col: x, row: y, cell: cell };
                    errorprev = error;
                }
            } else {
                // the same as above
                errorprev = error = dy;
                for (i = 0; i < dy; i++) {
                    y += ystep;
                    error += ddx;
                    if (error > ddy) {
                        x += xstep;
                        error -= ddy;
                        if (error + errorprev < ddy) {
                            if (collisionGrid.lineTypeCheck(x - xstep, y, type))
                                return collisionGrid.lineTestResult;
                        } else if (error + errorprev > ddy) {
                            if (collisionGrid.lineTypeCheck(x, y - ystep, type))
                                return collisionGrid.lineTestResult;
                        } else {
                            if (collisionGrid.lineTypeCheck(x - xstep, y, type))
                                return collisionGrid.lineTestResult;
                            if (collisionGrid.lineTypeCheck(x, y - ystep, type))
                                return collisionGrid.lineTestResult;
                        }
                    }
                    if (collisionGrid.lineTypeCheck(x, y, type))
                        return collisionGrid.lineTestResult;
                    errorprev = error;
                }
            }

            return { col: x, row: y, cell: 0 };
        },
    };
})();
