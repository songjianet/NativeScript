import { Color } from '../../color';
import { Trace } from '../../trace';
import { CORE_ANIMATION_DEFAULTS, getDurationWithDampingFromSpring } from '../common';

declare let UIImagePickerControllerSourceType: any;

const radToDeg = Math.PI / 180;

function isOrientationLandscape(orientation: number) {
	return orientation === UIDeviceOrientation.LandscapeLeft /* 3 */ || orientation === UIDeviceOrientation.LandscapeRight /* 4 */;
}

function openFileAtRootModule(filePath: string): boolean {
	try {
		const appPath = getCurrentAppPath();
		const path = isRealDevice() ? filePath.replace('~', appPath) : filePath;

		const controller = UIDocumentInteractionController.interactionControllerWithURL(NSURL.fileURLWithPath(path));
		controller.delegate = createUIDocumentInteractionControllerDelegate();

		return controller.presentPreviewAnimated(true);
	} catch (e) {
		Trace.write('Error in openFile', Trace.categories.Error, Trace.messageType.error);
	}

	return false;
}
// TODO: remove for NativeScript 9.0
export function getter<T>(_this: any, property: T | { (): T }): T {
	console.log('utils.ios.getter() is deprecated; use the respective native property instead');
	if (typeof property === 'function') {
		return (<{ (): T }>property).call(_this);
	} else {
		return <T>property;
	}
}

export namespace collections {
	export function jsArrayToNSArray<T>(str: T[]): NSArray<T> {
		return NSArray.arrayWithArray(str);
	}

	export function nsArrayToJSArray<T>(a: NSArray<T>): Array<T> {
		const arr = [];
		if (a !== undefined) {
			const count = a.count;
			for (let i = 0; i < count; i++) {
				arr.push(a.objectAtIndex(i));
			}
		}

		return arr;
	}
}

export function getRootViewController(): UIViewController {
	const win = getWindow();
	let vc = win && win.rootViewController;
	while (vc && vc.presentedViewController) {
		vc = vc.presentedViewController;
	}
	return vc;
}

export function getWindow(): UIWindow {
	const app = UIApplication.sharedApplication;
	if (!app) {
		return;
	}
	return app.keyWindow || (app.windows && app.windows.count > 0 && app.windows.objectAtIndex(0));
}

export function setWindowBackgroundColor(value: string) {
	const win = getWindow();
	if (win) {
		const bgColor = new Color(value);
		win.backgroundColor = bgColor.ios;
		const rootVc = getRootViewController();
		if (rootVc?.view) {
			rootVc.view.backgroundColor = bgColor.ios;
		}
	}
}

export function isLandscape(): boolean {
	console.log('utils.ios.isLandscape() is deprecated; use application.orientation instead');

	const deviceOrientation = UIDevice.currentDevice.orientation;
	const statusBarOrientation = UIApplication.sharedApplication.statusBarOrientation;

	const isDeviceOrientationLandscape = isOrientationLandscape(deviceOrientation);
	const isStatusBarOrientationLandscape = isOrientationLandscape(statusBarOrientation);

	return isDeviceOrientationLandscape || isStatusBarOrientationLandscape;
}

export const MajorVersion = NSString.stringWithString(UIDevice.currentDevice.systemVersion).intValue;

export function openFile(filePath: string): boolean {
	console.log('utils.ios.openFile() is deprecated; use utils.openFile() instead');

	return openFileAtRootModule(filePath);
}

export function getCurrentAppPath(): string {
	const currentDir = __dirname;
	const tnsModulesIndex = currentDir.indexOf('/tns_modules');

	// Module not hosted in ~/tns_modules when bundled. Use current dir.
	let appPath = currentDir;
	if (tnsModulesIndex !== -1) {
		// Strip part after tns_modules to obtain app root
		appPath = currentDir.substring(0, tnsModulesIndex);
	}

	return appPath;
}

export function joinPaths(...paths: string[]): string {
	if (!paths || paths.length === 0) {
		return '';
	}

	return NSString.stringWithString(NSString.pathWithComponents(<any>paths)).stringByStandardizingPath;
}

export function getVisibleViewController(rootViewController: UIViewController): UIViewController {
	let viewController = rootViewController;

	while (viewController && viewController.presentedViewController) {
		viewController = viewController.presentedViewController;
	}
	return viewController;
}

export function applyRotateTransform(transform: CATransform3D, x: number, y: number, z: number): CATransform3D {
	if (x) {
		transform = CATransform3DRotate(transform, x * radToDeg, 1, 0, 0);
	}

	if (y) {
		transform = CATransform3DRotate(transform, y * radToDeg, 0, 1, 0);
	}

	if (z) {
		transform = CATransform3DRotate(transform, z * radToDeg, 0, 0, 1);
	}

	return transform;
}

export function getShadowLayer(nativeView: UIView, name: string = 'ns-shadow-layer', create: boolean = true): CALayer {
	return nativeView.layer;

	console.log(`--- ${create ? 'CREATE' : 'READ'}`);

	/**
	 * UIView
	 *  -> Shadow
	 *
	 *
	 *  UIView
	 *   -> UIView
	 *   -> Shadow
	 */

	if (!nativeView) {
		return null;
	}

	if (!nativeView.layer) {
		// should never hit this?
		console.log('- no layer! -');
		return null;
	}

	// if the nativeView's layer is the shadow layer?
	if (nativeView.layer.name === name) {
		console.log('- found shadow layer - reusing.');
		return nativeView.layer;
	}

	console.log('>> layer                :', nativeView.layer);
	if (nativeView.layer.sublayers?.count) {
		const count = nativeView.layer.sublayers.count;
		for (let i = 0; i < count; i++) {
			const subLayer = nativeView.layer.sublayers.objectAtIndex(i);

			console.log(`>> subLayer ${i + 1}/${count}         :`, subLayer);
			console.log(`>> subLayer ${i + 1}/${count} name    :`, subLayer.name);

			if (subLayer.name === name) {
				console.log('- found shadow sublayer - reusing.');
				return subLayer;
			}
		}
		// if (nativeView instanceof UITextView) {
		// 	return nativeView.layer.sublayers.objectAtIndex(1);
		// } else {
		// 	return nativeView.layer.sublayers.objectAtIndex(nativeView.layer.sublayers.count - 1);
		// }
	}
	// else {
	// 		layer = nativeView.layer;
	// }

	// we're not interested in creating a new layer
	if (!create) {
		return null;
	}

	console.log(`- adding a new layer for - ${name}`);

	const viewLayer = nativeView.layer;
	const newLayer = CALayer.layer();

	newLayer.name = name;
	newLayer.zPosition = 0.0;
	// nativeView.layer.insertSublayerBelow(newLayer, nativeView.layer)
	// newLayer.insertSublayerAtIndex(nativeView.layer, 0)
	// nativeView.layer.zPosition = 1.0;
	// nativeView.layer.addSublayer(newLayer);

	// nativeView.layer = CALayer.layer()

	nativeView.layer.insertSublayerAtIndex(newLayer, 0);
	// nativeView.layer.insertSublayerAtIndex(viewLayer, 1)

	// nativeView.layer.replaceSublayerWith(newLayer, nativeView.layer);

	return newLayer;
}

export function createUIDocumentInteractionControllerDelegate(): NSObject {
	@NativeClass
	class UIDocumentInteractionControllerDelegateImpl extends NSObject implements UIDocumentInteractionControllerDelegate {
		public static ObjCProtocols = [UIDocumentInteractionControllerDelegate];

		public getViewController(): UIViewController {
			const app = UIApplication.sharedApplication;

			return app.keyWindow.rootViewController;
		}

		public documentInteractionControllerViewControllerForPreview(controller: UIDocumentInteractionController) {
			return this.getViewController();
		}

		public documentInteractionControllerViewForPreview(controller: UIDocumentInteractionController) {
			return this.getViewController().view;
		}

		public documentInteractionControllerRectForPreview(controller: UIDocumentInteractionController): CGRect {
			return this.getViewController().view.frame;
		}
	}
	return new UIDocumentInteractionControllerDelegateImpl();
}

export function isRealDevice() {
	try {
		// https://stackoverflow.com/a/5093092/4936697
		const sourceType = UIImagePickerControllerSourceType.UIImagePickerControllerSourceTypeCamera;
		const mediaTypes = UIImagePickerController.availableMediaTypesForSourceType(sourceType);

		return !!mediaTypes;
	} catch (e) {
		return true;
	}
}

export function printCGRect(rect: CGRect) {
	if (rect) {
		return `CGRect(${rect.origin.x} ${rect.origin.y} ${rect.size.width} ${rect.size.height})`;
	}
}

export function snapshotView(view: UIView, scale: number): UIImage {
	if (view instanceof UIImageView) {
		return view.image;
	}
	// console.log('snapshotView view.frame:', printRect(view.frame));
	const originalOpacity = view.layer.opacity;
	view.layer.opacity = originalOpacity > 0 ? originalOpacity : 1;
	UIGraphicsBeginImageContextWithOptions(CGSizeMake(view.frame.size.width, view.frame.size.height), false, scale);
	view.layer.renderInContext(UIGraphicsGetCurrentContext());
	const image = UIGraphicsGetImageFromCurrentImageContext();
	UIGraphicsEndImageContext();
	view.layer.opacity = originalOpacity;
	return image;
}

export function copyLayerProperties(view: UIView, toView: UIView, customProperties?: { view?: Array<keyof UIView>; layer?: Array<keyof CALayer> }) {
	const viewPropertiesToMatch: Array<keyof UIView> = customProperties?.view || ['backgroundColor'];
	const layerPropertiesToMatch: Array<keyof CALayer> = customProperties?.layer || ['cornerRadius', 'borderWidth', 'borderColor'];

	viewPropertiesToMatch.forEach((property) => {
		if (view[property] !== toView[property]) {
			// console.log('|    -- matching view property:', property);
			view[property as any] = toView[property];
		}
	});

	layerPropertiesToMatch.forEach((property) => {
		if (view.layer[property] !== toView.layer[property]) {
			// console.log('|    -- matching layer property:', property);
			view.layer[property as any] = toView.layer[property];
		}
	});
}

export function animateWithSpring(options?: { tension?: number; friction?: number; mass?: number; delay?: number; velocity?: number; animateOptions?: UIViewAnimationOptions; animations?: () => void; completion?: (finished?: boolean) => void }) {
	// for convenience, default spring settings are provided
	const opt = {
		...CORE_ANIMATION_DEFAULTS.spring,
		delay: 0,
		animateOptions: null,
		animations: null,
		completion: null,
		...(options || {}),
	};
	const { duration, damping } = getDurationWithDampingFromSpring(opt);

	if (duration === 0) {
		UIView.animateWithDurationAnimationsCompletion(0, opt.animations, opt.completion);
		return;
	}
	UIView.animateWithDurationDelayUsingSpringWithDampingInitialSpringVelocityOptionsAnimationsCompletion(duration, opt.delay, damping, opt.velocity, opt.animateOptions, opt.animations, opt.completion);
}
