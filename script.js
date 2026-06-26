import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Lenis Connect

const lenis = new Lenis({
	smooth: true,
	multiplier: 0.25,
	easing: (t) => t * (2 - t),
	smoothTouch: true,
	lerp: 0.1,
	duration: 1.5
});

const raf = (time) => {
	lenis.raf(time);
	requestAnimationFrame(raf);
};
requestAnimationFrame(raf);

gsap.registerPlugin(ScrollTrigger, SplitText);

// Scene

const scene = new THREE.Scene();

// Camera Position

const camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);
camera.position.z = 5;
camera.lookAt(0, 0, 0);
scene.add(camera);

// Renderer Functional

const modelContainer = document.querySelector("#donut");

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(modelContainer.clientWidth, modelContainer.clientHeight);
modelContainer.appendChild(renderer.domElement);

// Light Functional

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
ambientLight.position.set(0, 0.5, 5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
scene.add(directionalLight);

// Model Loading

let model;
const loader = new GLTFLoader();
let initialState = null;
let initialContainerY = null;

loader.load(
	"./src/assets/cookie-1.glb",
	(gltf) => {
		model = gltf.scene;

		// model.children[0].children[0].children[0].children[0].children[1].children[0].children[0].material.color.set(
		// 	"#ffc6f3"
		// );

		// Center and scale the model automatically
		const box = new THREE.Box3().setFromObject(model);
		const center = box.getCenter(new THREE.Vector3());
		const size = box.getSize(new THREE.Vector3());
		const maxDim = Math.max(size.x, size.y, size.z);

		// Normalize the cookie to a reasonable size
		const targetSize = 2.8; // Scale model to match the letter K cap height
		const scale = targetSize / maxDim;

		model.scale.set(scale, scale, scale);
		model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

		// The cookie is centered here.
		const centeredGroup = new THREE.Group();
		centeredGroup.add(model);

		// The wrapper applies a specific rotation (0, 1.5, 0.75) for the GSAP animations.
		// To make the cookie perfectly face the camera (like an "O"), we calculate the exact inverse
		// and apply it, then rotate the cookie 90 degrees on X to face the camera.
		const wrapperEuler = new THREE.Euler(0, 1.5, 0.75, "XYZ");
		const wrapperQuat = new THREE.Quaternion().setFromEuler(wrapperEuler);
		const faceCameraEuler = new THREE.Euler(Math.PI / 2, -Math.PI / 2, 0, "XYZ");
		const faceCameraQuat = new THREE.Quaternion().setFromEuler(faceCameraEuler);

		centeredGroup.quaternion.copy(wrapperQuat).invert().multiply(faceCameraQuat);

		// Wrap the model in an outer group to apply rotation and position responsive logic safely
		const wrapper = new THREE.Group();
		wrapper.add(centeredGroup);
		wrapper.rotation.set(0, 1.5, 0.75);
		model = wrapper;

		scene.add(model);

		initialState = {
			scale: model.scale.clone(),
			position: model.position.clone(),
			rotation: model.rotation.clone()
		};

		initialContainerY = {
			y: gsap.getProperty(modelContainer, "y"),
			x: gsap.getProperty(modelContainer, "x")
		};

		setupGsapAnimations(model);
		handleResponsive();
	}
);

const animate = () => {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
};
animate();

// Model Responsive

const handleResponsive = () => {
	const width = window.innerWidth;

	if (!model) return;

	const dots = [
		{ width: 1600, scale: 0.98, position: [0.08, 0.45, -2], z: 5 },
		{ width: 1440, scale: 0.98, position: [0.08, 0.45, -2], z: 5 },
		{ width: 1280, scale: 0.98, position: [0.08, 0.45, -2], z: 5 },
		{ width: 1200, scale: 0.98, position: [0.08, 0.45, -2], z: 5 },
		{ width: 1024, scale: 0.98, position: [0.08, 0.45, -3], z: 5.5 },
		{ width: 960, scale: 0.98, position: [0.08, 0.45, -3], z: 6 },
		{ width: 768, scale: 0.7, position: [0.1, 0.2, -1.2], z: 6.5 },
		{ width: 640, scale: 0.7, position: [0.05, 0.2, -1.2], z: 7 },
		{ width: 575, scale: 0.6, position: [0.0, 0.2, -1.2], z: 7 },
		{ width: 475, scale: 0.5, position: [-0.05, 0.15, -1.2], z: 7 },
		{ width: 375, scale: 0.45, position: [-0.05, 0.15, -1.2], z: 7.5 },
		{ width: 0, scale: 0.35, position: [-0.05, 0.15, -1.2], z: 7.5 }
	];

	const dot = dots.find((d) => width >= d.width) || dots[dots.length - 1];

	model.scale.set(dot.scale, dot.scale, dot.scale);
	model.position.set(...dot.position);
	camera.position.z = dot.z;

	camera.aspect = modelContainer.clientWidth / modelContainer.clientHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(modelContainer.clientWidth, modelContainer.clientHeight);
	renderer.setPixelRatio(window.devicePixelRatio);
};

const debounce = (func, delay = 200) => {
	let timeoutId;
	return (...args) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func.apply(this, args), delay);
	};
};

let lastWidth = window.innerWidth;

const onResize = debounce(() => {
	const currentWidth = window.innerWidth;
	if (currentWidth !== lastWidth) {
		handleResponsive();
		lastWidth = currentWidth;
		window.location.reload();
		setupGsapAnimations();
	}
});

window.addEventListener("resize", onResize);

// Site GSAP Animations

const setupGsapAnimations = (model) => {
	// const donutTop =
	// 	model.children[0].children[0].children[0].children[0].children[1].children[0]
	// 		.children[0].material;
	// const donutParticles =
	// 	model.children[0].children[0].children[0].children[0].children[2].children[0]
	// 		.children[0];
	// donutParticles.material.transparent = true;
	// donutParticles.material.opacity = 1;
	const donutTop = { color: { r: 1, g: 1, b: 1 } };
	const donutParticles = { material: { transparent: true, opacity: 1 } };
	const isMobile = () => window.innerWidth < 768;

	// Hero Section Animations
	const timeline = gsap.timeline({
		scrollTrigger: {
			trigger: "#hero",
			start: () => (isMobile() ? "top top" : "top-=20 top"),
			end: () => `+=${window.innerHeight * 1.2}px`,
			pin: true,
			pinSpacing: false,
			scrub: true
		}
	});

	timeline.to(model.rotation, { y: Math.PI * 2.5, duration: 1 });

	// Transition Section Animations

	const timeline2 = gsap.timeline({
		scrollTrigger: {
			trigger: "#transition",
			start: "top bottom",
			end: () => `+=${window.innerHeight / 4}px`,
			scrub: true
		}
	});

	timeline2
		.to(model.rotation, { x: 0, z: 0.8, duration: 1 })
		.to(
			model.scale,
			{
				x: window.innerWidth < 575 ? 2 : 3,
				y: window.innerWidth < 575 ? 2 : 3,
				z: window.innerWidth < 575 ? 2 : 3,
				duration: 1
			},
			"<"
		)
		.to(model.position, { x: 0, y: 0, z: -5, duration: 1 }, "<")
		.to(
			modelContainer,
			{
				x: "0vw",
				y: window.innerHeight >= 800 ? "10vh" : "20vh",
				duration: 1
			},
			"<+=0.1"
		);

	// Flip Section Animations

	const toggleFlipFigures = (visible) => {
		gsap.to(".flip__figures", {
			autoAlpha: visible ? 1 : 0,
			duration: 0.5,
			ease: visible ? "power1.out" : "power1.in"
		});
	};

	const timeline3 = gsap.timeline({
		scrollTrigger: {
			trigger: "#flip",
			end: () => `+=${window.innerHeight * 1.5}px`,
			scrub: 1,
			pin: true,
			pinSpacing: false,
			onEnter: () => toggleFlipFigures(true),
			onLeave: () => toggleFlipFigures(false),
			onEnterBack: () => toggleFlipFigures(true),
			onLeaveBack: () => toggleFlipFigures(false)
		}
	});

	timeline3
		.to(model.scale, {
			x: () => (window.innerWidth >= 1440 ? 1 : (window.innerWidth >= 1024 ? 0.8 : (window.innerWidth >= 768 ? 0.7 : (window.innerWidth >= 575 ? 0.6 : 0.5)))) * 1.6,
			y: () => (window.innerWidth >= 1440 ? 1 : (window.innerWidth >= 1024 ? 0.8 : (window.innerWidth >= 768 ? 0.7 : (window.innerWidth >= 575 ? 0.6 : 0.5)))) * 1.6,
			z: () => (window.innerWidth >= 1440 ? 1 : (window.innerWidth >= 1024 ? 0.8 : (window.innerWidth >= 768 ? 0.7 : (window.innerWidth >= 575 ? 0.6 : 0.5)))) * 1.6,
			duration: 0.5
		})
		.fromTo(".flip__splash-container", { scale: 1.5, opacity: 0 }, { scale: 0.9, opacity: 1, duration: 0.5 }, "<")
		.to(modelContainer, { y: "5vh", duration: 0.5 }, "<")
		.to(model.rotation, { y: Math.PI * 4.5, duration: 0.5 }, "<");

	// Steps Section Animations

	const cardsArray = Array.from(document.querySelectorAll(".steps__card"));

	const colors = [
		{ r: 0.9568627450980393, g: 0.9254901960784314, b: 0.8666666666666667 },
		{ r: 0.9098039215686274, g: 0.5490196078431373, b: 0.7333333333333333 },
		{ r: 0.16862745098039217, g: 0.047058823529411764, b: 0.011764705882352941 }
	];

	const timeline4 = gsap.timeline({
		scrollTrigger: {
			trigger: "#steps",
			start: "top top",
			end: () => `+=${window.innerHeight * 4}`,
			scrub: 1,
			pin: true,
			pinSpacing: false
		}
	});

	const stepsHeading = document.querySelector(".steps__heading");

	timeline4
		.to(
			modelContainer,
			{
				y: () => {
					return window.innerWidth < 768 ? "25vh" : "5vh";
				},
				duration: 1
			},
			0
		)
		.to(
			model.scale,
			{
				x: window.innerWidth < 1300 ? 1.5 : 2.25,
				y: window.innerWidth < 1300 ? 1.5 : 2.25,
				z: window.innerWidth < 1300 ? 1.5 : 2.25,
				duration: 1
			},
			"<"
		)
		.to(
			donutTop.color,
			{
				r: 0.62,
				g: 0.8,
				b: 0.39,
				duration: 1,
				ease: "cubic-bezier(0.4, 0, 0.2, 1)"
			},
			"<"
		);

	if (stepsHeading)
		timeline4.to(stepsHeading, { opacity: 1, y: 0, duration: 0.5 }, "<");

	timeline4.to(
		".steps__indicator:nth-child(1)",
		{
			opacity: 1,
			duration: 1,
			ease: "power2.out"
		},
		0
	);

	cardsArray.forEach((card, index) => {
		const y = `-${(index + 1) * 96}vh`;
		const color = colors[index % colors.length];
		const stepTime = (index + 1) * 5;
		const delayTime = stepTime + 0.3;

		timeline4
			.to(
				card,
				{ y: y, duration: 1, ease: "cubic-bezier(0.4, 0, 0.2, 1)" },
				stepTime
			)
			.to(
				donutTop.color,
				{
					r: color.r,
					g: color.g,
					b: color.b,
					duration: 5,
					ease: "cubic-bezier(0.4, 0, 0.2, 1)"
				},
				stepTime - 2
			)
			.to(
				model.rotation,
				{
					y: "+=" + Math.PI * 2,
					duration: 5,
					ease: "cubic-bezier(0.4, 0, 0.2, 1)"
				},
				delayTime - 2
			);

		timeline4.to(
			`.steps__indicator:nth-child(${index + 2})`,
			{
				opacity: 1,
				duration: 1,
				ease: "power2.out"
			},
			stepTime
		);

		timeline4.to(
			`.steps__indicator:nth-child(${index + 1})`,
			{
				opacity: 0.2,
				duration: 1,
				ease: "power2.out"
			},
			stepTime
		);

		if (index === cardsArray.length - 1) {
			timeline4.to(
				".steps__indicator",
				{
					opacity: 0.2,
					duration: 1,
					ease: "power2.out"
				},
				stepTime + 10
			);
		}
	});

	// Second Transition Section

	const timeline5 = gsap.timeline({
		scrollTrigger: {
			trigger: "#second-transition",
			start: "top bottom",
			end: () => `+=${window.innerHeight * 2.5}px`,
			scrub: true
		}
	});

	timeline5
		.to(
			donutTop.color,
			{
				r: 0.9098039215686274,
				g: 0.5490196078431373,
				b: 0.7333333333333333,
				duration: 5,
				ease: "power3.out"
			},
			"0"
		)
		.to(
			donutParticles.material,
			{ opacity: 1, duration: 1, ease: "power2.out" },
			"<"
		)
		.to(
			model.scale,
			{
				x: window.innerHeight < 600 || window.innerWidth < 1024 ? 2.0 : 2.75,
				y: window.innerHeight < 600 || window.innerWidth < 1024 ? 2.0 : 2.75,
				z: window.innerHeight < 600 || window.innerWidth < 1024 ? 2.0 : 2.75,
				duration: 1
			},
			"<"
		)
		.to(
			modelContainer,
			{
				x: () => {
					if (window.innerWidth < 640) return "0vw";
					if (window.innerHeight < 650) return "0";
					return "20vw";
				},
				y: () => {
					if (window.innerHeight < 650) return "5vh";
					if (window.innerWidth < 640) return "5vh";
					return "0vh";
				},
				duration: 1
			},
			"<"
		);

	// Quality Section Animations

	const timeline6 = gsap.timeline({
		scrollTrigger: {
			trigger: "#numbers-wrapper",
			start: "top center",
			end: "bottom center",
			scrub: 0.2
		}
	});

	timeline6.to(
		model.rotation,
		{
			y: "+=" + Math.PI * 2,
			duration: 1,
			ease: "power2.inOut"
		},
		0
	);

	// (Removed final section animations as per user request to hide the 3D model)

	// CTA Section Animations
	const timeline7 = gsap.timeline({
		scrollTrigger: {
			trigger: ".cta-section",
			start: "top bottom",
			end: "top top",
			scrub: true
		}
	});

	timeline7
		.to(
			modelContainer,
			{
				x: "-25vw",
				duration: 1
			},
			0
		)
		.to(
			model.scale,
			{
				x: 2.25,
				y: 2.25,
				z: 2.25,
				duration: 1
			},
			0
		);
};

// Control Model Functional

let isDragging = false;
let prevMousePosition = { x: 0, y: 0 };
let controlModel = false;
let rotationReset = false;
let hasSavedRotation = false;
let savedRotation = null;
let isModelRestored = false;

window.addEventListener("mousedown", (event) => {
	if (controlModel) {
		if (!isDragging && !hasSavedRotation && model) {
			savedRotation = model.rotation.clone();
			hasSavedRotation = true;
		}

		rotationReset = false;
		isModelRestored = false;
	}

	if (!isDragging) isDragging = true;

	prevMousePosition = { x: event.clientX, y: event.clientY };

	if (!savedRotation) return;
});

window.addEventListener("mousemove", (event) => {
	if (!isDragging || !controlModel || !savedRotation) return;

	if (isModelRestored) return;

	const mouseMove = {
		x: event.clientX - prevMousePosition.x,
		y: event.clientY - prevMousePosition.y
	};

	if (model) {
		model.rotation.y += mouseMove.x * 0.0025;
		model.rotation.x += mouseMove.y * 0.0025;
	}

	prevMousePosition = { x: event.clientX, y: event.clientY };
});

window.addEventListener("touchstart", (event) => {
	if (event.touches.length === 2 && controlModel) {
		if (!isDragging && !hasSavedRotation && model) {
			savedRotation = model.rotation.clone();
			hasSavedRotation = true;
		}

		rotationReset = false;
	}

	if (event.touches.length === 2) {
		isDragging = true;
		prevMousePosition = {
			x: event.touches[0].clientX,
			y: event.touches[0].clientY
		};
	}
});

window.addEventListener(
	"touchmove",
	(event) => {
		if (
			!isDragging ||
			!controlModel ||
			event.touches.length !== 2 ||
			!savedRotation
		)
			return;

		const touch = event.touches[0];
		const mouseMove = {
			x: touch.clientX - prevMousePosition.x,
			y: touch.clientY - prevMousePosition.y
		};

		if (model) {
			model.rotation.y += mouseMove.x * 0.0025;
			model.rotation.x += mouseMove.y * 0.0025;
		}

		prevMousePosition = {
			x: touch.clientX,
			y: touch.clientY
		};

		event.preventDefault();
	},
	{ passive: false }
);

window.addEventListener("touchend", () => {
	isDragging = false;
});

window.addEventListener("mouseup", () => {
	isDragging = false;
});

// Main Site Functional

document.addEventListener("DOMContentLoaded", () => {
	// Preloader
	setTimeout(() => {
		const preloader = document.querySelector('.preloader');
		if (preloader) {
			preloader.style.opacity = '0';
			setTimeout(() => {
				preloader.style.display = 'none';
			}, 500);
		}
	}, 1000);

	const header = document.querySelector(".header");
	const openMenu = document.querySelector("#openMenu");
	const closeMenu = document.querySelector("#closeMenu");
	const mobileMenu = document.querySelector("#mobile-menu");
	const mousePointer = document.querySelector("#scroll-btn");
	const menuLinks = [...document.querySelectorAll('a[href^="#"]')];
	const returnBtn = document.querySelector("#return-btn");

	// Return Button

	if (returnBtn) {
		returnBtn.addEventListener("click", () => {
			lenis.scrollTo(0, {
				offset: 0,
				duration: 1.2,
				easing: (t) => t,
				onComplete: () => {
					if (initialState && model) {
						gsap.to(model.scale, {
							x: initialState.scale.x,
							y: initialState.scale.y,
							z: initialState.scale.z,
							duration: 0.8,
							ease: "power2.out"
						});

						gsap.to(modelContainer, {
							y: initialContainerY.y,
							x: initialContainerY.x,
							duration: 0.8,
							ease: "power2.out"
						});
					}
				}
			});
		});
	}

	// Site Scrolling

	let lastScroll = 0;

	window.addEventListener("scroll", () => {
		const currentScroll = window.scrollY;
		const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
		const isScrollingDown = currentScroll > lastScroll;
		const windowHeight = window.innerHeight;
		const firstSectionHeight = windowHeight * 1.75;

		if (currentScroll < firstSectionHeight || currentScroll >= maxScroll - 10) {
			returnBtn.classList.remove("active");
		} else {
			if (isScrollingDown) {
				returnBtn.classList.remove("active");
			} else {
				returnBtn.classList.add("active");
			}
		}

		lastScroll = currentScroll <= 0 ? 0 : currentScroll;

		if (window.scrollY > 100) {
			header.classList.add("scrolling");
		} else {
			header.classList.remove("scrolling");
		}

		if (controlModel && !rotationReset && savedRotation) {
			rotationReset = true;
			isModelRestored = true;

			gsap.to(model.rotation, {
				x: savedRotation.x,
				y: savedRotation.y,
				z: savedRotation.z,
				duration: 1,
				ease: "power2.out"
			});
		}
	});

	// Mobile Menu

	if (openMenu) {
		openMenu.addEventListener("click", () => {
			document.body.classList.add("menu-open");
			mobileMenu.classList.add("active");
		});
	}

	if (closeMenu) {
		closeMenu.addEventListener("click", () => {
			document.body.classList.remove("menu-open");
			mobileMenu.classList.remove("active");
		});
	}

	// Mouse Scrolling

	if (mousePointer) {
		mousePointer.addEventListener("click", () => {
			lenis.scrollTo(window.scrollY + window.innerHeight * 3, {
				immediate: false,
				offset: 350,
				duration: 5
			});
		});
	}

	// Menu Links Scroll

	menuLinks.forEach((anchor) => {
		anchor.addEventListener("click", (e) => {
			e.preventDefault();
			mobileMenu.classList.remove("active");
			document.body.classList.remove("menu-open");

			const target = document.querySelector(anchor.getAttribute("href"));
			if (target) {
				lenis.scrollTo(target, {
					immediate: false,
					offset: 700,
					duration: 5
				});
			}
		});
	});
});