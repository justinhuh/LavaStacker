//Justin Huh
//CS 174A
//Assignment 2
//004480345

"use strict"
var canvas, canvas_size, gl = null, g_addrs,
	movement = vec2(),	thrust = vec3(), 	looking = false, prev_time = 0, animate = false, animation_time = 0;
		var gouraud = false, color_normals = false, solid = false;
function CURRENT_BASIS_IS_WORTH_SHOWING(self, model_transform) { self.m_axis.draw( self.basis_id++, self.graphicsState, model_transform, new Material( vec4( .8,.3,.8,1 ), .5, 1, 1, 40, "" ) ); }


// *******************************************************
// IMPORTANT -- In the line below, add the filenames of any new images you want to include for textures!

var texture_filenames_to_load = [ "stars.png", "text.png", "earth.gif", "stone.png", "stone2.png", "stone3.png", "mountain.png", "lava.png", "lavacave.png", "lavacave2.png" ,"lavaball.png", "wool.png", "skin.png" ];

// *******************************************************	
// When the web page's window loads it creates an "Animation" object.  It registers itself as a displayable object to our other class "GL_Context" -- which OpenGL is told to call upon every time a
// draw / keyboard / mouse event happens.

window.onload = function init() {	var anim = new Animation();	}
function Animation()
{
	( function init (self) 
	{
		self.context = new GL_Context( "gl-canvas" );
		self.context.register_display_object( self );
		
		gl.clearColor( .8, .4, 0, .9 );			// Background color
		
		for( var i = 0; i < texture_filenames_to_load.length; i++ )
			initTexture( texture_filenames_to_load[i], true );
		
		self.m_cube = new cube();
		self.m_pyramid = new pyramid();
		self.m_obj = new shape_from_file( "teapot.obj" )
		self.m_axis = new axis();
		self.m_sphere = new sphere( mat4(), 4 );	
		self.m_fan = new triangle_fan_full( 10, mat4() );
		self.m_strip = new rectangular_strip( 1, mat4() );
		self.m_cylinder = new cylindrical_strip( 10, mat4() );
		
		// 1st parameter is camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
		self.graphicsState = new GraphicsState( translation(0, 0,-40), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );

		gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);		gl.uniform1i( g_addrs.SOLID_loc, solid);
		
		self.context.render();	
	} ) ( this );	
	
	canvas.addEventListener('mousemove', function(e)	{		e = e || window.event;		movement = vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2, 0);	});
}
var press = 0;
// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
	shortcut.add( "Space", function() { thrust[1] = -1; } );			shortcut.add( "Space", function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "z",     function() { thrust[1] =  1; } );			shortcut.add( "z",     function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "w",     function() { thrust[2] =  1; } );			shortcut.add( "w",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "a",     function() { thrust[0] =  1; } );			shortcut.add( "a",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "s",     function() { thrust[2] = -1; } );			shortcut.add( "s",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "d",     function() { thrust[0] = -1; } );			shortcut.add( "d",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "f",     function() { looking = !looking; } );
	shortcut.add( ",",     ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0,  1 ), self.graphicsState.camera_transform ); }; } ) (this) ) ;
	shortcut.add( ".",     ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0, -1 ), self.graphicsState.camera_transform ); }; } ) (this) ) ;

	shortcut.add( "r",     ( function(self) { return function() { self.graphicsState.camera_transform = mat4(); }; } ) (this) );
	shortcut.add( "ALT+s", function() { solid = !solid;					gl.uniform1i( g_addrs.SOLID_loc, solid);	
																		gl.uniform4fv( g_addrs.SOLID_COLOR_loc, vec4(Math.random(), Math.random(), Math.random(), 1) );	 } );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud;				gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);	} );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);	} );
	shortcut.add( "ALT+a", function() { animate = !animate; } );
	
	shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );
	shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );	
	shortcut.add("b",function() 
	{
		press += 1;
	});
	}

function update_camera( self, animation_delta_time )
	{
		var leeway = 70, border = 50;
		var degrees_per_frame = .0002 * animation_delta_time;
		var meters_per_frame  = .01 * animation_delta_time;
																					// Determine camera rotation movement first
		var movement_plus  = [ movement[0] + leeway, movement[1] + leeway ];		// movement[] is mouse position relative to canvas center; leeway is a tolerance from the center.
		var movement_minus = [ movement[0] - leeway, movement[1] - leeway ];
		var outside_border = false;
		
		for( var i = 0; i < 2; i++ )
			if ( Math.abs( movement[i] ) > canvas_size[i]/2 - border )	outside_border = true;		// Stop steering if we're on the outer edge of the canvas.

		for( var i = 0; looking && outside_border == false && i < 2; i++ )			// Steer according to "movement" vector, but don't start increasing until outside a leeway window from the center.
		{
			var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
			self.graphicsState.camera_transform = mult( rotation( velocity, i, 1-i, 0 ), self.graphicsState.camera_transform );			// On X step, rotate around Y axis, and vice versa.
		}
		self.graphicsState.camera_transform = mult( translation( scale_vec( meters_per_frame, thrust ) ), self.graphicsState.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
	}

// *******************************************************	

var numCubes = 0;

//indicators to start certain scenes 
var passFlag = 0;
var passFlag2 = 0;
var passFlag3 = 0;
var passFlag4 = 0;
var passFlag5 = 0;
var passFlag6 = 0;

var loseSceneFlag = 0;
var winSceneFlag = 0;

var failFlag = 0;
var failPosition = 0;
var failTranslate = 0;
var once = 0;
var once2 = 0;
var once3 = 0;
var once4 = 0;
var once5 = 0;
var once6 = 0;

var position = 0; //position of blocks
var still_position = 0;

//timing helpers
var winTime = 0;
var winMoveTime = 0;
var loseTime = 0;
var loseFallTime = 0;
var winWalkTime = 0;
var winFallTime = 0;

//audio variables
var newSound = new Audio("lava2.wav");
var key1 = new Audio ("key1.wav");
var key2 = new Audio ("key2.wav");
var key3 = new Audio ("key3.wav");
var key4 = new Audio ("key4.wav");
var key5 = new Audio ("key5.wav");
var key6 = new Audio ("key6.wav");
var thud = new Audio ("thud.wav");
var scream = new Audio ("scream.mp3");
var key1once = 0;
var key2once = 0;
var key3once = 0;
var key4once = 0;
var key5once = 0;
var key6once = 0;
var thudonce = 0;
var thudonce2 = 0;
var thudonce3 = 0;
var screamonce = 0;

// display(): called once per frame, whenever OpenGL decides it's time to redraw.

Animation.prototype.display = function(time)
	{
		if(!time) time = 0;
		this.animation_delta_time = time - prev_time;
		if(animate) this.graphicsState.animation_time += this.animation_delta_time;
		prev_time = time;
		
		update_camera( this, this.animation_delta_time );
			
		this.basis_id = 0;
		
		var model_transform = mat4();
		
		// Materials: Declare new ones as needed in every function.
		// 1st parameter:  Color (4 floats in RGBA format), 2nd: Ambient light, 3rd: Diffuse reflectivity, 4th: Specular reflectivity, 5th: Smoothness exponent, 6th: Texture image.
		var purplePlastic = new Material( vec4( .9,.5,.9,1 ), .2, .5, .8, 40 ), // Omit the final (string) parameter if you want no texture
			greyPlastic = new Material( vec4( .5,.5,.5,1 ), .2, .8, .5, 20 ),
			earth = new Material( vec4( .5,.5,.5,1 ), .5, 1, .5, 40, "earth.gif" ),
			stars = new Material( vec4( .5,.5,.5,1 ), .5, 1, 1, 40, "stars.png" ),
			stone = new Material( vec4( .5,.5,.5,1 ), .5, 1, 1, 40, "stone.png" ),
			stone2 = new Material( vec4( .5,.5,.5,1 ), .5, 1, 1, 40, "stone2.png" ),
			stone3 = new Material( vec4( .5,.5,.5,1 ), .4, .2, .5, 100, "stone3.png" ),
			mountain = new Material( vec4( .5,.5,.5,1 ), .5, .5, .6, 80, "mountain.png" ),
			lava = new Material( vec4( .5,.5,.5,1 ), (.7 + .1*Math.sin(.001 * this.graphicsState.animation_time)), 1, 1, 40, "lava.png" ),
			lavacave = new Material( vec4( .5,.5,.5,1 ), .6, .5, .6, 80, "lavacave.png" ),
			lavacave2 = new Material( vec4( .5,.5,.5,1 ), .5, .5, .6, 80, "lavacave2.png" ),
			lavaball = new Material( vec4( .5,.5,.5,1 ), .4, .5, .6, 40, "lavaball.png" ),
			wool = new Material( vec4( .5,.5,.5,1 ), .4, .5, .6, 40, "wool.png" ),
			skin = new Material( vec4( .5,.5,.5,1 ), .4, .5, .6, 40, "skin.png" ),
			red = new Material( vec4( 1,0,0,1 ), 1, .8, .5, 20 ),
			brown = new Material( vec4( .82,.41,.12,1 ), 1, .8, .5, 20 ),
			indigo = new Material( vec4( .29,0,.51,1 ), 1, .8, .5, 20 ),
			grey = new Material( vec4( .5,.5,.5,1 ), 1, .8, .5, 20 ),
			lightgrey = new Material( vec4( .83,.83,.83,1 ), .1, .8, .5, 20 ),
			black = new Material( vec4( 0, 0, 0,1 ), 1, .8, .5, 20 ),
			green = new Material( vec4( .6,.8,.2,1 ), 1, .8, .5, 20 ),
			yellow = new Material( vec4( 1, 1, 0,1 ), 1, .8, .5, 20 );
			
			
		/**********************************
		Start coding here!!!!
		**********************************/
		var stack = [];		
		
		model_transform = mult(model_transform, scale(3, 3, 3)); //everything is scaled by 3
		model_transform = mult(model_transform, translation(0, -5, 0)); //everything is translated -3
		
		//draw cube function, takes an argument n, the number of cubes
		//maybe implement a parameter that changes pattern of colors of cubes
		Animation.prototype.drawCubes = function(model_transform,s,n)
		{
		model_transform = mult(model_transform, translation(s, 0, 0)); 
		stack.push(model_transform);		
			for (var x = 0; x < n; x++)
			{	
				this.m_cube.draw(this.graphicsState, model_transform, stone);		
				model_transform = mult(model_transform, translation(1, 0, 0)); 
			}
		model_transform = stack.pop();
		}	
		
		//===DRAW PLATFORM FUNCTION===
		Animation.prototype.drawPlatform = function(model_transform, n, color)
		{
			stack.push(model_transform);
				if (color == 0)
				{
					for (var x = 0; x < n; x++)
					{	
						this.m_cube.draw(this.graphicsState, model_transform, stone3);		
						model_transform = mult(model_transform, translation(-1, 0, 0)); 
					}
				}
				else if (color == 1)
				{
					for (var x = 0; x < n; x++)
					{	
						this.m_cube.draw(this.graphicsState, model_transform, mountain);		
						model_transform = mult(model_transform, translation(-1, 0, 0)); 
					}
				}
			model_transform = stack.pop();
		}		

		//===RESETS GAME
		Animation.prototype.gameReset = function()
		{
			loseSceneFlag = 0;
			loseFallTime = 0;
			winSceneFlag = 0;
			winMoveTime = 0;
			winWalkTime = 0;
			winFallTime = 0;
			failFlag = 0;
			passFlag = 0;
			passFlag2 = 0;
			passFlag3 = 0;
			passFlag4 = 0;
			passFlag5 = 0;
			passFlag6 = 0;
			press = 0;
			loseTime = 0;
			winTime = 0;
			once = 0;
			once2 = 0;
			once3 = 0;
			once4 = 0;
			once5 = 0;
			once6 = 0;
			key1once = 0;
			key2once = 0;
			key3once = 0;
			key4once = 0;
			key5once = 0;
			key6once = 0;
			thudonce = 0;
			thudonce2 = 0;
			thudonce3 = 0;
			screamonce = 0;
		}
		//===SOUND===
		if (animate)
			newSound.play();
		
		//===SKYBOX===
		stack.push(model_transform)
			model_transform = mult(model_transform, translation(0, 75, -50)); 
			model_transform = mult(model_transform, scale(350, 300, 300));
			this.m_cube.draw(this.graphicsState, model_transform, lavacave);
		model_transform = stack.pop();		
		
		//===DRAW SPIKEBALLS====
		Animation.prototype.drawSpikeBall = function(n2, speed)
		{
			this.m_sphere.draw(this.graphicsState, model_transform, lavaball);
			stack.push(model_transform)				
				model_transform = mult(model_transform, translation(0, .5, 0));
				model_transform = mult(model_transform, scale(.5, .5, .5)); 
				this.m_pyramid.draw(this.graphicsState, model_transform, lavaball);
				model_transform = mult(model_transform, rotation(90, 0, 0, 1)); 
				model_transform = mult(model_transform, translation(-1, 1, 0));
				this.m_pyramid.draw(this.graphicsState, model_transform, lavaball);
				model_transform = mult(model_transform, rotation(90, 0, 0, 1)); 
				model_transform = mult(model_transform, translation(-1, 1, 0));
				this.m_pyramid.draw(this.graphicsState, model_transform, lavaball);
				model_transform = mult(model_transform, rotation(90, 0, 0, 1)); 
				model_transform = mult(model_transform, translation(-1, 1, 0));
				this.m_pyramid.draw(this.graphicsState, model_transform, lavaball);
				model_transform = mult(model_transform, rotation(90, 0, 0, 1)); 
				model_transform = mult(model_transform, translation(-1, 1, 0));
				this.m_pyramid.draw(this.graphicsState, model_transform, lavaball);
				model_transform = mult(model_transform, rotation(90, 1,0 , 0)); 
				model_transform = mult(model_transform, translation(0, 1, 1));
				this.m_pyramid.draw(this.graphicsState, model_transform, lavaball);
				model_transform = mult(model_transform, rotation(180, 1,0 , 0)); 
				model_transform = mult(model_transform, translation(0, 2, 0));
				this.m_pyramid.draw(this.graphicsState, model_transform, lavaball);
			model_transform = stack.pop();
		}
	
		//===GROUND===
		stack.push(model_transform)
			model_transform = mult(model_transform, translation(1, -1, 0)); 
			model_transform = mult(model_transform, scale(300, 3, 300));
			this.m_cube.draw(this.graphicsState, model_transform, lava);
		model_transform = stack.pop();
	
		//===BOBBING OBJECTS===
		stack.push(model_transform)
			model_transform = mult(model_transform, translation(1, -1, 0)); 
			model_transform = mult(model_transform, translation(-6, 5*Math.sin(.001 * this.graphicsState.animation_time), 2)); 
			model_transform = mult(model_transform, scale(1/3, 1/3, 1/3));
			this.drawSpikeBall();
		model_transform = stack.pop();
		stack.push(model_transform)
			model_transform = mult(model_transform, translation(1, -1, 0)); 
			model_transform = mult(model_transform, translation(6, 10*Math.sin(.002 * this.graphicsState.animation_time), -10)); 
			model_transform = mult(model_transform, scale(1/3, 1/3, 1/3));
			this.drawSpikeBall();
		model_transform = stack.pop();
		stack.push(model_transform)
			model_transform = mult(model_transform, translation(1, -1, 0)); 
			model_transform = mult(model_transform, translation(-8, 12*Math.sin(.0007 * this.graphicsState.animation_time), -45)); 
			model_transform = mult(model_transform, scale(1/3, 1/3, 1/3));
			this.drawSpikeBall();
		model_transform = stack.pop();
		stack.push(model_transform)
			model_transform = mult(model_transform, translation(1, -1, 0)); 
			model_transform = mult(model_transform, translation(-30, 2*Math.sin(.0015 * this.graphicsState.animation_time), -60)); 
			model_transform = mult(model_transform, scale(1/3, 1/3, 1/3));
			this.drawSpikeBall();
		model_transform = stack.pop();
		stack.push(model_transform)
			model_transform = mult(model_transform, translation(1, -1, 0)); 
			model_transform = mult(model_transform, translation(40, 6*Math.sin(-.0012 * this.graphicsState.animation_time), -60)); 
			model_transform = mult(model_transform, scale(1/3, 1/3, 1/3));
			this.drawSpikeBall();
		model_transform = stack.pop();
		
		//===PLATFORM AND HUMAN===		
		stack.push(model_transform)
			//===PLATFORMS===
			stack.push(model_transform)
				//RIGHT PLATFORM
				model_transform = mult(model_transform, translation(19, 7, 0));
				this.drawPlatform(model_transform, 15, 1);				
			model_transform = stack.pop();
			
			//FALLING
			if (loseSceneFlag == 1) //if lose
			{			
				loseFallTime += this.animation_delta_time;
				model_transform = mult(model_transform, translation(0, -loseFallTime/75, 0));
			}		
			
			//SHAKING PLATFORM
			if (winSceneFlag == 0)
			{
				model_transform = mult(model_transform, translation(0, .1*Math.sin(.025 * this.graphicsState.animation_time), 0));
			}		
			
			//LEFT PLATFORM
			if (winSceneFlag == 1)
			{
				winFallTime += this.animation_delta_time;
				stack.push(model_transform)			
					if (winFallTime > 500)
					{
						model_transform = mult(model_transform, translation(0, -(winFallTime-500)/75, 0));												
						model_transform = mult(model_transform, translation(-3, 7, 0));
						this.drawPlatform(model_transform, 5, 0);
					}	
					else
					{
						stack.push(model_transform)					
							model_transform = mult(model_transform, translation(-3, 7, 0));
							this.drawPlatform(model_transform, 5, 0);
						model_transform = stack.pop();
					}
				model_transform = stack.pop();
			}
			else
			{
			stack.push(model_transform)					
				model_transform = mult(model_transform, translation(-3, 7, 0));
				this.drawPlatform(model_transform, 5, 0);
			model_transform = stack.pop();
			}			
			
			//===HUMAN===		
			stack.push(model_transform)		
				model_transform = mult(model_transform, translation(-3, 10, 0));
				if (winSceneFlag == 1) //moves human across bridge
				{
					
					model_transform = mult(model_transform, rotation(90, 0, 1, 0));	
					winMoveTime += this.animation_delta_time;
					model_transform = mult(model_transform, translation(0, 0, winMoveTime/500));
					winWalkTime += this.animation_delta_time;
					if (winWalkTime > 1000 && winWalkTime < 4000) //camera follow from 1 to 4 seconds
						this.graphicsState.camera_transform = lookAt(vec3(1*model_transform[0][3], 5,1*model_transform[2][3] + 40), vec3(1*model_transform[0][3], 5, 5*model_transform[2][3]), vec3(0,1,0));
					else
						this.graphicsState.camera_transform = lookAt(vec3(0,0,40), vec3(0,0,0), vec3(0,1,0));
				}
				else
					this.graphicsState.camera_transform = lookAt(vec3(0,0,40), vec3(0,0,0), vec3(0,1,0));
				
				//head				
				model_transform = mult(model_transform, scale(1/3, 1/3, 1/3)); 			
				this.m_sphere.draw(this.graphicsState, model_transform, skin);
				//body
				model_transform = mult(model_transform, translation(0, -3, 0));
				model_transform = mult(model_transform, scale(2, 4, 2)); 	
				this.m_cube.draw(this.graphicsState, model_transform, wool);
				model_transform = mult(model_transform, scale(1/2, 1/4, 1/2)); 
				//legs
				stack.push(model_transform)	
					stack.push(model_transform);
						//leg1
						if (winSceneFlag == 1) //walk
						{
							model_transform = mult(model_transform, translation(1, -2, 0));
							model_transform = mult(model_transform, rotation(30 * Math.sin(.005 * this.graphicsState.animation_time), 1, 0, 0));				
							model_transform = mult(model_transform, translation(-.5, -1.5, 0));
							model_transform = mult(model_transform, scale(1, 3, 1));
							this.m_cube.draw(this.graphicsState, model_transform, grey);
						}
						else
						{
							model_transform = mult(model_transform, translation(.5, -3.5, 0));
							model_transform = mult(model_transform, scale(1, 3, 1));
							this.m_cube.draw(this.graphicsState, model_transform, grey);
						}
					model_transform = stack.pop()
					
					//leg2
					stack.push(model_transform);
						model_transform = mult(model_transform, translation(-1, 0, 0));
						if (winSceneFlag == 1)
						{
							model_transform = mult(model_transform, translation(1, -2, 0));
							model_transform = mult(model_transform, rotation(-30 * Math.sin(.005 * this.graphicsState.animation_time), 1, 0, 0));				
							model_transform = mult(model_transform, translation(-.5, -1.5, 0));
							model_transform = mult(model_transform, scale(1, 3, 1));
							this.m_cube.draw(this.graphicsState, model_transform, grey);
						}
						else
						{
							model_transform = mult(model_transform, translation(.5, -3.5, 0));
							model_transform = mult(model_transform, scale(1, 3, 1));
							this.m_cube.draw(this.graphicsState, model_transform, grey);
						}
					model_transform = stack.pop()
					
					this.m_cube.draw(this.graphicsState, model_transform, grey);
				model_transform = stack.pop();
				//arms
				stack.push(model_transform);
					//arm1
					stack.push(model_transform);
						if (winSceneFlag == 0) //wave arms
						{
							model_transform = mult(model_transform, translation(1, 2, 0));
							model_transform = mult(model_transform, rotation(90, 0, 0, 1));			
							model_transform = mult(model_transform, rotation(30 * Math.sin(.01 * this.graphicsState.animation_time), 0, 0, 1));							
							model_transform = mult(model_transform, translation(.5, -1.5, 0));
							model_transform = mult(model_transform, scale(1, 3, 1));
							this.m_cube.draw(this.graphicsState, model_transform, skin);
						}	
						else //arm movement during win scene (swinging)
						{
						model_transform = mult(model_transform, translation(1, 2, 0));
						model_transform = mult(model_transform, rotation(20 * Math.sin(.002 * this.graphicsState.animation_time), 1, 0, 0));			
						model_transform = mult(model_transform, translation(.5, -1.5, 0));
						model_transform = mult(model_transform, scale(1, 3, 1));
						this.m_cube.draw(this.graphicsState, model_transform, skin);
						}	
					model_transform = stack.pop();
					//arm2
					stack.push(model_transform);
						model_transform = mult(model_transform, translation(-3, 0, 0));
						if (winSceneFlag == 0) //wave arms
						{
							model_transform = mult(model_transform, translation(2, 2, 0));
							model_transform = mult(model_transform, rotation(-90, 0, 0, 1));		
							model_transform = mult(model_transform, rotation(-30 * Math.sin(.01 * this.graphicsState.animation_time), 0, 0, 1));							
							model_transform = mult(model_transform, translation(-.5, -1.5, 0));
							model_transform = mult(model_transform, scale(1, 3, 1));
							this.m_cube.draw(this.graphicsState, model_transform, skin);
						}	
						else
						{
						model_transform = mult(model_transform, translation(2, 2, 0));
						model_transform = mult(model_transform, rotation(-20 * Math.sin(.002 * this.graphicsState.animation_time), 1, 0, 0));
						model_transform = mult(model_transform, translation(-.5, -1.5, 0));
						model_transform = mult(model_transform, scale(1, 3, 1));
						this.m_cube.draw(this.graphicsState, model_transform, skin);
						}	
					model_transform = stack.pop();
				model_transform = stack.pop();				
			model_transform = stack.pop();
		model_transform = stack.pop();		
			
		var time_nextLevel = this.graphicsState.animation_time % 5000; //% period of the movement
		
		//===CUBE MOVEMENT FUNCTION===
		//one translation occurs every ((speed/2)/(5)) animation_time units
		Animation.prototype.drawNextLevel = function(n2, speed)
		{			
			numCubes = n2;
			model_transform = mult(model_transform, translation(0, 1, 0));
			stack.push(model_transform);
					//cube movement
					model_transform = mult(model_transform, translation(-n2-2, 0, 0)); //n2+1 is to account for ceiling	
					if (time_nextLevel < speed/2 ) //movement to right	
					{					
						model_transform = mult(model_transform, translation( Math.ceil(time_nextLevel /((speed/2)/(6))) + 1, 0, 0));	//6 + n2 is to account for ceiling 
						//position tracker
						position =  Math.ceil(time_nextLevel /((speed/2)/(6))) % ((6));
					}
					if (time_nextLevel >= speed/2 ) //movement to left
					{
						model_transform = mult(model_transform, translation( Math.ceil(-(time_nextLevel - speed)/((speed/2)/(6))), 0, 0)); 
						//position tracker
						position =  -((Math.ceil(time_nextLevel /((speed/2)/(6))) % ((6)))+1) ;
					}
					this.drawCubes(model_transform, 0, n2);
			model_transform = stack.pop();			
		}
		
		//===CUBE DRAW HELPER===
		Animation.prototype.getFailTranslate = function(pos)
		{			
			if (pos == -1)
				failTranslate = -3;
			if (pos == 1 || pos == -6)
				failTranslate = -2;
			if (pos == 2 || pos == -5)
				failTranslate = -1;
			if (pos == 3 || pos == -4)
				failTranslate = 0;
			if (pos == 4 || pos == -3)
				failTranslate = 1;
			if (pos == 5 || pos == -2)
				failTranslate = 2;
			if (pos == 0)
				failTranslate = 3;
		}
 		
		//===GAME LOGIC===
		if (press == 0)	//no cube has been stacked
		{
			model_transform = mult(model_transform, translation(0,1,0));
			this.drawNextLevel(1,5000);
			model_transform = mult(model_transform, translation(0,-1,0));
		}
		if (press == 1) //button is pressed
		{
			if (once == 0)
			{
				still_position = position;
				once = 1;
			}
			
			//if position is correct, set passFlag = 1;
			if (still_position == 3 || still_position == -4)
			{
				model_transform = mult(model_transform, translation(0,press+1,0));
				passFlag = 1;
				time_nextLevel = this.graphicsState.animation_time % 4000;
				this.drawNextLevel(1, 4000);	
				model_transform = mult(model_transform, translation(0,-press-1,0));
			}				
			else	
			{
				failFlag = 1;
				this.getFailTranslate(still_position);
				model_transform = mult(model_transform, translation(0,1,0));
			}				
		}		
		
		if (press == 2) //button is pressed
		{
			if (once2 == 0)
			{
				still_position = position;
				once2 = 1;
			}
			//if position is correct, set passFlag = 1;
			if (still_position == 3 || still_position == -4)
			{
				model_transform = mult(model_transform, translation(0,press+1,0));
				passFlag2 = 1;
				time_nextLevel = this.graphicsState.animation_time % 3000;
				this.drawNextLevel(1, 3000);	
				model_transform = mult(model_transform, translation(0,-press-1,0));
			}				
			else	
			{
				failFlag = 1;
				this.getFailTranslate(still_position);
				model_transform = mult(model_transform, translation(0,1,0));
			}					
		}		
		
		if (press == 3) //button is pressed
		{
			if (once3 == 0)
			{
				still_position = position;
				once3 = 1;
			}
			//if position is correct, set passFlag = 1;
			if (still_position == 3 || still_position == -4)
			{
				model_transform = mult(model_transform, translation(0,press+1,0));
				passFlag3 = 1;
				time_nextLevel = this.graphicsState.animation_time %1500;
				this.drawNextLevel(1, 1500);	
				model_transform = mult(model_transform, translation(0,-press-1,0));
			}				
			else	
			{
				failFlag = 1;
				this.getFailTranslate(still_position);
				model_transform = mult(model_transform, translation(0,1,0));
			}						
		}
		
		if (press == 4) //button is pressed
		{
			if (once4 == 0)
			{
				still_position = position;
				once4 = 1;
			}
			//if position is correct, set passFlag = 1;
			if (still_position == 3 || still_position == -4)
			{
				model_transform = mult(model_transform, translation(0,press+1,0));
				passFlag4 = 1;
				time_nextLevel = this.graphicsState.animation_time % 1000;
				this.drawNextLevel(1, 1000);	
				model_transform = mult(model_transform, translation(0,-press-1,0));
			}				
			else	
			{
				failFlag = 1;
				this.getFailTranslate(still_position);
				model_transform = mult(model_transform, translation(0,1,0));
			}						
		}
		
		if (press == 5) //button is pressed
		{
			if (once5 == 0)
			{
				still_position = position;
				once5 = 1;
			}
			//if position is correct, set passFlag = 1;
			if (still_position == 3 || still_position == -4)
			{
				model_transform = mult(model_transform, translation(0,press+1,0));
				passFlag5 = 1;
				time_nextLevel = this.graphicsState.animation_time % 750;
				this.drawNextLevel(1, 750);	
				model_transform = mult(model_transform, translation(0,-press-1,0));
			}				
			else	
			{
				failFlag = 1;
				this.getFailTranslate(still_position);
				model_transform = mult(model_transform, translation(0,1,0));
			}						
		}			
		if (press == 6) //win stage
		{
			if (once6 == 0)
			{
				still_position = position;
				once6 = 1;
			}
			//if position is correct, set passFlag = 1;
			if (still_position == 3 || still_position == -4)
			{
				passFlag6 = 1;
				model_transform = mult(model_transform, translation(0,1,0));
			}				
			else	
			{
				failFlag = 1;
				this.getFailTranslate(still_position);
				model_transform = mult(model_transform, translation(0,1,0));
			}						
		}	
		
		
		//===PERMANENT CUBES===
		this.drawCubes(model_transform, 1, 1);
		if (passFlag == 1) //1st level passed
		{
			if (key1once == 0)
			{
				key1.play();
				key1once = 1;
			}
			model_transform = mult(model_transform, translation(0,1,0));	
			this.drawCubes(model_transform, 1, 1); //draw static cubes based on location			
		}
		if (passFlag2 == 1) //2nd level passed
		{
			if (key2once == 0)
			{
				key2.play();
				key2once = 1;
			}
			model_transform = mult(model_transform, translation(0,1,0));	
			this.drawCubes(model_transform, 1, 1); //draw static cubes based on location			
		}
		if (passFlag3 == 1) //...
		{
			if (key3once == 0)
			{
				key3.play();
				key3once = 1;
			}
			model_transform = mult(model_transform, translation(0,1,0));	
			this.drawCubes(model_transform, 1, 1); //draw static cubes based on location			
		}
		if (passFlag4 == 1)
		{
			if (key4once == 0)
			{
				key4.play();
				key4once = 1;
			}
			model_transform = mult(model_transform, translation(0,1,0));	
			this.drawCubes(model_transform, 1, 1); //draw static cubes based on location			
		}
		if (passFlag5 == 1)
		{
			if (key5once == 0)
			{
				key5.play();
				key5once = 1;
			}
			model_transform = mult(model_transform, translation(0,1,0));	
			this.drawCubes(model_transform, 1, 1); //draw static cubes based on location			
		}
		if (passFlag6 == 1) //win scene
		{
			if (key6once == 0)
			{
				key6.play();
				key6once = 1;
			}
			//draw final cube
			model_transform = mult(model_transform, translation(0,1,0));	
			this.drawCubes(model_transform, 1, 1); //draw static cubes based on location
			
			winTime += this.animation_delta_time;
			if (winTime > 3000)
			{
				this.drawCubes(model_transform, 2, 1); 
				this.drawCubes(model_transform, 0, 1); 
				if (thudonce == 0)
				{
					thud.play();
					thudonce = 1;
				}
			}	
			if (winTime > 4000)
			{
				this.drawCubes(model_transform, 3, 1); 
				this.drawCubes(model_transform, -1, 1); 
				if (thudonce2 == 0)
				{
					thud.play();
					thudonce2 = 1;
				}
			}
			if (winTime > 5000)
			{
				this.drawCubes(model_transform, 4, 1); 
				this.drawCubes(model_transform, -2, 1); 
				if (thudonce3 == 0)
				{
					thud.play();
					thudonce3 = 1;
				}
			}
			if (winTime > 7000)
			{
				winSceneFlag = 1;//have human walk across newly made bridge, set 
			}
			if (winTime > 13000) //after 13 seconds game resets after showing message
			{
				window.alert("The hero crosses safely and continues his journey...\nThank you");
				this.gameReset();
			}
		}
		if (failFlag == 1) //fail scene
		{
			//draw cube where it was paused incorrectly			
			model_transform = mult(model_transform, translation(failTranslate,1,0));	
			this.drawCubes(model_transform, 1, 1); //draw static cubes based on location						
			
			loseTime += this.animation_delta_time;
			if (loseTime > 1000)
			{
				if (screamonce == 0)
				{
					scream.play();
					screamonce = 1;
				}
				loseSceneFlag = 1; //starts the lose scene
			}
			if (loseTime > 4000) //after 4 seconds, game restarts
			{
				this.gameReset();
			}
			
		}
		
		model_transform = stack.pop();
	}	

Animation.prototype.update_strings = function( debug_screen_strings )		// Strings this particular class contributes to the UI
{
	debug_screen_strings.string_map["framerate"] = "Frame Rate: " + Math.round(1000/this.animation_delta_time) + " FPS";
	debug_screen_strings.string_map["time"] = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
	debug_screen_strings.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_strings.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	debug_screen_strings.string_map["thrust"] = "Thrust: " + thrust;
}