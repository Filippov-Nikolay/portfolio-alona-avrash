export function primeAnimation<T extends gsap.core.Animation>(animation: T) {
    animation.progress(1, true).progress(0, true);
    return animation;
}
