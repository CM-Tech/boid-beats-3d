
import * as THREE from 'three';

import Stats from 'stats-js';
import { GUI } from 'dat.gui';

import { GPUComputationRenderer } from './GPUComputationRenderer.js';

/* TEXTURE WIDTH FOR SIMULATION */
var WIDTH = 32;

var BIRDS = WIDTH * WIDTH;

// Custom Geometry - using 3 triangles each. No UVs, no normals currently.
var BirdGeometry = function () {

	var triangles = BIRDS * 3;
	var points = triangles * 3;

	THREE.BufferGeometry.call(this);

	var vertices = new THREE.BufferAttribute(new Float32Array(points * 3), 3);
	var birdColors = new THREE.BufferAttribute(new Float32Array(points * 3), 3);
	var references = new THREE.BufferAttribute(new Float32Array(points * 2), 2);
	var birdVertex = new THREE.BufferAttribute(new Float32Array(points), 1);

	this.setAttribute('position', vertices);
	this.setAttribute('birdColor', birdColors);
	this.setAttribute('reference', references);
	this.setAttribute('birdVertex', birdVertex);

	// this.setAttribute( 'normal', new Float32Array( points * 3 ), 3 );


	var v = 0;

	function verts_push() {

		for (var i = 0; i < arguments.length; i++) {

			vertices.array[v++] = arguments[i];

		}

	}

	var wingsSpan = 20;

	for (var f = 0; f < BIRDS; f++) {

		// Body
		verts_push(
			0, - 0, - 20,
			0, 4, - 20,
			0, 0, 30
		);

		// Left Wing
		verts_push(
			0, 0, - 15,
			- wingsSpan, 0, 0,
			0, 0, 15
		);

		// Right Wing
		verts_push(
			0, 0, 15,
			wingsSpan, 0, 0,
			0, 0, - 15
		);

	}

	for (var v = 0; v < triangles * 3; v++) {

		var i = ~ ~(v / 3);
		var x = (i % WIDTH) / WIDTH;
		var y = ~ ~(i / WIDTH) / WIDTH;

		var c = new THREE.Color(
			0x444444 +
			~ ~(v / 9) / BIRDS * 0x666666
		);

		birdColors.array[v * 3 + 0] = c.r;
		birdColors.array[v * 3 + 1] = c.g;
		birdColors.array[v * 3 + 2] = c.b;

		references.array[v * 2] = x;
		references.array[v * 2 + 1] = y;

		birdVertex.array[v] = v % 9;

	}

	this.scale(0.2, 0.2, 0.2);

};

BirdGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);


var container, stats;
var camera, scene, renderer;
var mouseX = 0, mouseY = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var BOUNDS = 800, BOUNDS_HALF = BOUNDS / 2;

var last = performance.now();

var gpuCompute;
var velocityVariable;
var positionVariable;
var colorVariable;
var positionUniforms;
var velocityUniforms;
var colorUniforms;
var birdUniforms;
var micc = false;
var calibrationCountdown = 1000;
var BoidBeat = function () {
	this.speed = 1;
	this.directions = 6;
	this.turning = true;
	this.lineWidth = 1;
	this.song = window.location.hash.slice(1) ? "/#" + window.location.hash.slice(1) : "/#300%20Violin%20Orchestra";
	this.activateMic = startMicD;
	this.tThreshold = 0.3;
	this.calibrate = () => calibrationCountdown = 1000;
	// Define render logic ...
};
var freqCount = 256;
function getRMS(spectrum) {
	var rms = 0;
	for (var i = 0; i < spectrum.length; i++) {
		rms += spectrum[i] * spectrum[i];
	}
	rms /= spectrum.length;
	rms = Math.sqrt(rms);
	return rms;
}
function Microphone(_fft) {
	var FFT_SIZE = _fft || 1024; this.spectrum = [];
	this.volume = this.vol = 0;
	this.peak_volume = 0; var self = this;
	// A more accurate way to get overall volume
	this.getRMS = function (spectrum) {
		var rms = 0;
		for (var i = 0; i < spectrum.length; i++) {
			rms += spectrum[i] * spectrum[i];
		}
		rms /= spectrum.length;
		rms = Math.sqrt(rms);
		return rms;
	}
	var audioContext = new AudioContext();
	var SAMPLE_RATE = audioContext.sampleRate;

	// this is just a browser check to see
	// if it supports AudioContext and getUserMedia
	// window.AudioContext = window.AudioContext ||  window.webkitAudioContext;
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;  // now just wait until the microphone is fired up
	function init() {
		try {
			startMic(new AudioContext());
		}
		catch (e) {
			console.error(e);
			alert('Web Audio API could not be called, check that the url starts with https:// and not http://');
		}
	}
	this.init = init;
	function startMic(context) {
		navigator.getUserMedia({ audio: true }, processSound, error); function processSound(stream) {     // analyser extracts frequency, waveform, etc.
			var analyser = context.createAnalyser();
			analyser.smoothingTimeConstant = 0.2;
			analyser.fftSize = FFT_SIZE; var node = context.createScriptProcessor(FFT_SIZE * 2, 1, 1); node.onaudioprocess = function () {       // bitcount returns array which is half the FFT_SIZE
				self.spectrum = new Uint8Array(analyser.frequencyBinCount);       // getByteFrequencyData returns amplitude for each bin
				analyser.getByteFrequencyData(self.spectrum);
				// getByteTimeDomainData gets volumes over the sample time
				// analyser.getByteTimeDomainData(self.spectrum);

				self.vol = self.getRMS(self.spectrum);
				// get peak - a hack when our volumes are low
				if (self.vol > self.peak_volume) self.peak_volume = self.vol;
				self.volume = self.vol;
			}; var input = context.createMediaStreamSource(stream);
			input.connect(analyser);
			analyser.connect(node);
			node.connect(context.destination);
		} function error() {
			console.log(arguments);
		}
	}//////// SOUND UTILITIES  ///////////// ..... we going to put more stuff here....return this;};var Mic = new Microphone();
}
window.Microphone = Microphone;
var audio = document.querySelector('audio');
function songchange(value) {
	window.location.hash = value.split("#").pop();
}
function hashchange() {
	audio.src = "https://cdn.glitch.com/7c659aa6-fe5f-4610-bdf3-3fd76117d9a5%2F" + window.location.hash.slice(1) + ".mp3";
	audio.classList.add("paused");
}
var controls = new BoidBeat();
window.onload = function () {
	var gui = new GUI();
	gui.add(controls, "song", {
		"Glorious Morning": "/#Glorious_morning",
		"Jumper": "/#Jumper",
		"Stride": "/#Stride-",
		"300 Violin Orchestra": "/#300%20Violin%20Orchestra",
		"ThunderZone v2": "/#638150_-ThunderZone-v2-",
		"Portugal The Man - Feel it Still": "/#Portugal.%20The%20Man%20-%20Feel%20It%20Still",
		"The XX - Intro": "/#00%20Intro",
		"Hall of the Mountain King": "/#Hall%20of%20the%20Mountain%20King",
		"Everybody Wants To Rule The World (7\" Version)": "/#Everybody%20Wants%20To%20Rule%20The%20World%20(7%20Version)",
		"Flight": "/#Flight",
		"Electroman Adventures V2": "/#Waterflame%20-%20Electroman%20Adventures%20V2",
		"Rasputin": "/#Rasputin",
	}).onChange(songchange);
	// gui.add(controls, 'speed', 0.125, 2);
	// gui.add(controls, 'lineWidth', 1, 10);
	// gui.add(controls, 'tThreshold', 0.01, 0.99);

	// gui.add(controls, 'directions', 2, 12);
	// gui.add(controls, 'turning');
	gui.add(controls, 'activateMic').name("useMicrophone");
	// gui.add(controls, 'calibrate');

};


var effectiveF = 16;
var trailSteps = 20;
var fastestTurnFreq = 10;
var q = 0;
var M = 4;
var scales = Math.log2(freqCount);
function logNt(v) {
	return (Math.log(v + 1) / Math.log(2)) / (Math.log(freqCount + 1) / Math.log(2));
}



if (window.location.hash) hashchange();
window.addEventListener("hashchange", hashchange);
var Mic;
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var analyser = audioCtx.createAnalyser();
analyser.connect(audioCtx.destination);

analyser.fftSize = freqCount * 2;
analyser.smoothingTimeConstant = 0.2;
const source = audioCtx.createMediaElementSource(audio);
source.connect(analyser);
var bpm = 240;

var hM = 100;
var historyLength = Math.floor((60 * 1000 / bpm) / (1000 / 60)) * hM;
let musica = [];
let musicmxl = [];
for (var i = 0; i < freqCount; i++) {
	musica.push(0);
	musicmxl.push(0);
}
let musicave=musica.slice();
var musics = [];
for (var i = 0; i < historyLength; i++) {
	var music2 = new Uint8Array(freqCount);
	musics.push(music2);
}
var ll = 0;
let music = new Uint8Array(freqCount).fill(0);
function main() {
	calibrationCountdown -= 1000 / 60;
	ll++;
	if (micc) {
		if (Mic.spectrum.length === freqCount) {
			music = Mic.spectrum.slice();
		}
	} else {
		analyser.getByteFrequencyData(music);
	}
	for (var i = 0; i < 0; i++) {
		music = music.map((x, i) => {
			var l = [x];
			if (i < freqCount - 1) {
				l.push(music[i + 1]);
			}
			if (i > 0) {
				l.push(music[i - 1]);
			}
			return Math.max(...l);
		})
	}
	musics.unshift(music.slice());
	musics.pop();
	musicave = [];
	for (var i = 0; i < freqCount; i++) {
		musica[i] = 0;
		musicmxl[i] = 0;
		musicave[i] = 0;
		for (var j = 0; j < historyLength; j++) {
			musicmxl[i] = Math.max(musics[j][i], musicmxl[i]);///historyLength;
		}
		musica[i] = musics[0][i]/musicmxl[i]*256;///historyLength;
		for (var j = 0; j < historyLength / hM; j++) {
		

			musicave[i] += musics[j][i] / historyLength * hM/musicmxl[i]*256;
		}
		
	}

}


audio.addEventListener("pause", () => {
	audio.classList.add("paused");
})
audio.addEventListener("play", () => {
	audioCtx.resume();
	audio.classList.remove("paused");
})
function startMicD() {
	micc = true;
	if (!Mic) {
		Mic = new Microphone(freqCount * 2);
		Mic.init();


	}
}
init();
animate();

function init() {

	container = document.createElement('div');
	document.body.appendChild(container);

	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 3000);
	camera.position.z = 500;

	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x000000);
	scene.fog = new THREE.Fog(0x000000, 100, 1000);

	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	container.appendChild(renderer.domElement);

	initComputeRenderer();

	stats = new Stats();
	// container.appendChild( stats.dom );

	document.addEventListener('mousemove', onDocumentMouseMove, false);
	document.addEventListener('touchstart', onDocumentTouchStart, false);
	document.addEventListener('touchmove', onDocumentTouchMove, false);

	//

	window.addEventListener('resize', onWindowResize, false);

	// var gui = new GUI();


	var effectController = {
		separation: 20.0,
		alignment: 20.0,
		cohesion: 20.0,
		freedom: 0.75
	};

	var valuesChanger = function () {

		velocityUniforms["separationDistance"].value = effectController.separation;
		velocityUniforms["alignmentDistance"].value = effectController.alignment;
		velocityUniforms["cohesionDistance"].value = effectController.cohesion;
		velocityUniforms["freedomFactor"].value = effectController.freedom;

		colorUniforms["separationDistance"].value = effectController.separation;
		colorUniforms["alignmentDistance"].value = effectController.alignment;
		colorUniforms["cohesionDistance"].value = effectController.cohesion;
		colorUniforms["freedomFactor"].value = effectController.freedom;

	};

	valuesChanger();

	// gui.add( effectController, "separation", 0.0, 100.0, 1.0 ).onChange( valuesChanger );
	// gui.add( effectController, "alignment", 0.0, 100, 0.001 ).onChange( valuesChanger );
	// gui.add( effectController, "cohesion", 0.0, 100, 0.025 ).onChange( valuesChanger );
	// gui.close();

	initBirds();

}

function initComputeRenderer() {

	gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);

	if (isSafari()) {

		gpuCompute.setDataType(THREE.HalfFloatType);

	}

	var dtPosition = gpuCompute.createTexture();
	var dtVelocity = gpuCompute.createTexture();
	var dtColor = gpuCompute.createTexture();
	fillPositionTexture(dtPosition);
	fillVelocityTexture(dtVelocity);
	fillColorTexture(dtColor);

	velocityVariable = gpuCompute.addVariable("textureVelocity", document.getElementById('fragmentShaderVelocity').textContent, dtVelocity);
	positionVariable = gpuCompute.addVariable("texturePosition", document.getElementById('fragmentShaderPosition').textContent, dtPosition);
	colorVariable = gpuCompute.addVariable("textureColor", document.getElementById('fragmentShaderColor').textContent, dtColor);

	gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable,colorVariable]);
	gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);
	gpuCompute.setVariableDependencies(colorVariable, [positionVariable, velocityVariable, colorVariable]);

	positionUniforms = positionVariable.material.uniforms;
	velocityUniforms = velocityVariable.material.uniforms;
	colorUniforms = colorVariable.material.uniforms;

	positionUniforms["time"] = { value: 0.0 };
	positionUniforms["delta"] = { value: 0.0 };
	velocityUniforms["time"] = { value: 1.0 };
	velocityUniforms["delta"] = { value: 0.0 };
	velocityUniforms["testing"] = { value: 1.0 };
	velocityUniforms["separationDistance"] = { value: 1.0 };
	velocityUniforms["alignmentDistance"] = { value: 1.0 };
	velocityUniforms["cohesionDistance"] = { value: 1.0 };
	velocityUniforms["freedomFactor"] = { value: 1.0 };
	velocityUniforms["predator"] = { value: new THREE.Vector3() };
	velocityUniforms["music"] = { value: music };
	velocityUniforms["lmusic"] = { value: music };
	velocityVariable.material.defines.BOUNDS = BOUNDS.toFixed(2);


	colorUniforms["time"] = { value: 1.0 };
	colorUniforms["delta"] = { value: 0.0 };
	colorUniforms["testing"] = { value: 1.0 };
	colorUniforms["separationDistance"] = { value: 1.0 };
	colorUniforms["alignmentDistance"] = { value: 1.0 };
	colorUniforms["cohesionDistance"] = { value: 1.0 };
	colorUniforms["freedomFactor"] = { value: 1.0 };
	colorUniforms["music"] = { value: music };
	colorUniforms["lmusic"] = { value: music };
	colorUniforms["predator"] = { value: new THREE.Vector3() };
	colorVariable.material.defines.BOUNDS = BOUNDS.toFixed(2);

	velocityVariable.wrapS = THREE.RepeatWrapping;
	velocityVariable.wrapT = THREE.RepeatWrapping;
	positionVariable.wrapS = THREE.RepeatWrapping;
	positionVariable.wrapT = THREE.RepeatWrapping;

	colorVariable.wrapS = THREE.RepeatWrapping;
	colorVariable.wrapT = THREE.RepeatWrapping;

	var error = gpuCompute.init();

	if (error !== null) {

		console.error(error);

	}

}

function isSafari() {

	return !!navigator.userAgent.match(/Safari/i) && !navigator.userAgent.match(/Chrome/i);

}

function initBirds() {

	var geometry = new BirdGeometry();

	// For Vertex and Fragment
	birdUniforms = {
		"color": { value: new THREE.Color(0xff2200) },
		"texturePosition": { value: null },
		"textureVelocity": { value: null },
		"textureColor": { value: null },
		"time": { value: 1.0 },
		"delta": { value: 0.0 },"music":  { value: music },"lmusic":  { value: music }
	};

	// THREE.ShaderMaterial
	var material = new THREE.ShaderMaterial({
		uniforms: birdUniforms,
		vertexShader: document.getElementById('birdVS').textContent,
		fragmentShader: document.getElementById('birdFS').textContent,
		side: THREE.DoubleSide

	});

	var birdMesh = new THREE.Mesh(geometry, material);
	birdMesh.rotation.y = Math.PI / 2;
	birdMesh.matrixAutoUpdate = false;
	birdMesh.updateMatrix();

	scene.add(birdMesh);

}

function fillPositionTexture(texture) {

	var theArray = texture.image.data;

	for (var k = 0, kl = theArray.length; k < kl; k += 4) {

		var x = Math.random() * BOUNDS - BOUNDS_HALF;
		var y = Math.random() * BOUNDS - BOUNDS_HALF;
		var z = Math.random() * BOUNDS - BOUNDS_HALF;

		theArray[k + 0] = x;
		theArray[k + 1] = y;
		theArray[k + 2] = z;
		theArray[k + 3] = 1;

	}

}

function fillVelocityTexture(texture) {

	var theArray = texture.image.data;

	for (var k = 0, kl = theArray.length; k < kl; k += 4) {

		var x = Math.random() - 0.5;
		var y = Math.random() - 0.5;
		var z = Math.random() - 0.5;

		theArray[k + 0] = x * 1;
		theArray[k + 1] = y * 1;
		theArray[k + 2] = z * 1;
		theArray[k + 3] = 1;

	}

}

function fillColorTexture(texture) {

	var theArray = texture.image.data;

	for (var k = 0, kl = theArray.length; k < kl; k += 4) {

		var x = Math.random();
		var y = Math.random();
		var z = Math.random();

		theArray[k + 0] = x;
		theArray[k + 1] = y;
		theArray[k + 2] = z;
		theArray[k + 3] = 1;

	}

}


function onWindowResize() {

	windowHalfX = window.innerWidth / 2;
	windowHalfY = window.innerHeight / 2;

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

}

function onDocumentMouseMove(event) {

	mouseX = event.clientX - windowHalfX;
	mouseY = event.clientY - windowHalfY;

}

function onDocumentTouchStart(event) {

	if (event.touches.length === 1) {

		event.preventDefault();

		mouseX = event.touches[0].pageX - windowHalfX;
		mouseY = event.touches[0].pageY - windowHalfY;

	}

}

function onDocumentTouchMove(event) {

	if (event.touches.length === 1) {

		event.preventDefault();

		mouseX = event.touches[0].pageX - windowHalfX;
		mouseY = event.touches[0].pageY - windowHalfY;

	}

}

//

function animate() {

	requestAnimationFrame(animate);
	main();
	render();
	stats.update();

}

function render() {

	var now = performance.now();
	var delta = (now - last) / 1000;

	if (delta > 1) delta = 1; // safety cap on large deltas
	last = now;
	let mO=[...music].map((a,b)=>[musicave[b]+music[b],b]);
	mO.sort((a,b)=>b[0]-a[0])
	mO=mO.map((x)=>{
		let now=music[x[1]];
		let before=musicave[x[1]]
		return [Math.max(0,(now-before+0.0001)/(now/2+before/2+0.0001))*256*2,x[1]]
	});
	// mO.sort((a,b)=>b[0]-a[0])
	const lmusic=mO.slice(0,32).sort((a,b)=>a[1]-b[1]).map(x=>x[0]).concat(mO.slice(32).map(x=>x[0]));
	positionUniforms["time"].value = now;
	positionUniforms["delta"].value = delta;
	velocityUniforms["time"].value = now;
	velocityUniforms["delta"].value = delta;
	colorUniforms["time"].value = now;
	colorUniforms["delta"].value = delta;
	colorUniforms["music"].value=musica;
	velocityUniforms["music"].value=musica;
	velocityUniforms["lmusic"].value=lmusic;
	colorUniforms["lmusic"].value=lmusic;

	birdUniforms["time"].value = now;
	birdUniforms["delta"].value = delta;
	birdUniforms["music"].value=musica;

	birdUniforms["lmusic"].value=lmusic;
	velocityUniforms["predator"].value.set(0.5 * mouseX / windowHalfX, - 0.5 * mouseY / windowHalfY, 0);

	mouseX = 10000;
	mouseY = 10000;

	gpuCompute.compute();

	birdUniforms["texturePosition"].value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
	birdUniforms["textureVelocity"].value = gpuCompute.getCurrentRenderTarget(velocityVariable).texture;
	birdUniforms["textureColor"].value = gpuCompute.getCurrentRenderTarget(colorVariable).texture;

	renderer.render(scene, camera);

}