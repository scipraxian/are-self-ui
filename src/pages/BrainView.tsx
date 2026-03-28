/**
 * BrainView – the index route ("/").
 * Full-screen 3D brain visualization. Lobe clicks are handled by LayoutShell's
 * BackgroundCanvas, so this component just renders nothing (the background is
 * already visible behind the Outlet).
 */
export function BrainView() {
    // The interactive brain canvas is rendered by LayoutShell's background layer.
    // On the root route, LayoutShell passes the navigation handler to BackgroundCanvas.
    return null;
}
