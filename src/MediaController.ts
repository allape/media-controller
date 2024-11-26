export type CSSSelector = string;
export type Second = number;
export type Percent = number;

export interface IModifiedScope extends EventTarget {
  __mediaController?: MediaController;
}

export interface IKeyMask<T> {
  onNone: T;
  onShift: T;
  onCtrl: T;
  onShiftCtrl: T;
}

export interface IFocusKey {
  key: string;
  mask: Pick<KeyboardEvent, "shiftKey" | "ctrlKey">;
}

export interface IMediaControllerOptions {
  focusKey: IFocusKey;
  progress: IKeyMask<Second>;
  volume: IKeyMask<Percent>;
}

export function getDefaults<
  Options extends IMediaControllerOptions = IMediaControllerOptions,
>(): Options {
  return {
    focusKey: {
      key: "e",
      mask: {
        shiftKey: false,
        ctrlKey: true,
      },
    },
    progress: {
      onNone: 10,
      onShift: 1,
      onCtrl: 30,
      onShiftCtrl: 60,
    },
    volume: {
      onNone: 0.1,
      onShift: 0.01,
      onCtrl: 0.25,
      onShiftCtrl: 0.5,
    },
  } as Options;
}

export default class MediaController<
  Options extends IMediaControllerOptions = IMediaControllerOptions,
  T extends HTMLMediaElement = HTMLMediaElement,
> {
  protected readonly scope: IModifiedScope;
  protected target: T;

  constructor(
    scope: EventTarget,
    selector: T | CSSSelector,
    protected readonly options: Options = getDefaults<Options>(),
  ) {
    if (typeof selector === "string") {
      this.target = document.querySelector(selector) as T;
      if (!this.target) {
        throw new Error(`Cannot find element with selector: ${selector}`);
      }
    } else {
      this.target = selector;
    }

    this.scope = scope as IModifiedScope;

    this.scope.addEventListener("keydown", this.onScopeKeydown);
    this.target.addEventListener("keydown", this.onMediaKeydown);

    if (this.scope.__mediaController) {
      console.warn("Overwriting existing media controller");
      this.scope.__mediaController.dispose();
    }

    this.scope.__mediaController = this;
  }

  protected getTimeDelta(e: KeyboardEvent): number {
    const onCtrl = e.ctrlKey || e.metaKey;
    const onShift = e.shiftKey;

    if (onShift && onCtrl) {
      return this.options.progress.onShiftCtrl;
    } else if (onShift) {
      return this.options.progress.onShift;
    } else if (onCtrl) {
      return this.options.progress.onCtrl;
    }

    return this.options.progress.onNone;
  }

  protected getVolumeDelta(e: KeyboardEvent): number {
    const onCtrl = e.ctrlKey || e.metaKey;
    const onShift = e.shiftKey;

    if (onShift && onCtrl) {
      return this.options.volume.onShiftCtrl;
    } else if (onShift) {
      return this.options.volume.onShift;
    } else if (onCtrl) {
      return this.options.volume.onCtrl;
    }

    return this.options.volume.onNone;
  }

  protected readonly onScopeKeydown = (event: Event) => {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    const onCtrl = event.ctrlKey || event.metaKey;
    const onShift = event.shiftKey;

    if (
      event.key === this.options.focusKey.key &&
      onCtrl === this.options.focusKey.mask.ctrlKey &&
      onShift === this.options.focusKey.mask.shiftKey
    ) {
      this.target.focus();
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
    }
  };

  protected readonly onMediaKeydown = (event: Event) => {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    if (window.document.activeElement !== this.target) {
      return;
    }

    let acted = false;

    switch (event.key) {
      case "ArrowLeft":
        this.target.currentTime -= this.getTimeDelta(event);
        acted = true;
        break;
      case "ArrowRight":
        this.target.currentTime += this.getTimeDelta(event);
        acted = true;
        break;
      case "ArrowUp":
        this.target.volume += this.getVolumeDelta(event);
        acted = true;
        break;
      case "ArrowDown":
        this.target.volume -= this.getVolumeDelta(event);
        acted = true;
        break;
      case " ":
        this.target.paused ? this.target.play() : this.target.pause();
        acted = true;
        break;
      default:
    }

    if (acted) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
    }
  };

  public dispose() {
    this.scope.removeEventListener("keydown", this.onMediaKeydown);
    this.target.removeEventListener("keydown", this.onMediaKeydown);

    delete this.scope.__mediaController;
  }
}
