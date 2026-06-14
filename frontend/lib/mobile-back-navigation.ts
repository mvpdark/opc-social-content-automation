"use client";

export type MobileBackRequestSource = "gesture" | "native" | "browser";

export type MobileBackRequestDetail = {
  source: MobileBackRequestSource;
};

export const MOBILE_BACK_REQUEST_EVENT = "opc-mobile-back-request";

export function requestMobileNestedBack(source: MobileBackRequestSource) {
  if (typeof window === "undefined") {
    return false;
  }

  const event = new CustomEvent<MobileBackRequestDetail>(MOBILE_BACK_REQUEST_EVENT, {
    cancelable: true,
    detail: { source }
  });
  return !window.dispatchEvent(event);
}

export function addMobileBackHandler(handler: (detail: MobileBackRequestDetail) => boolean) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event: Event) => {
    if (event.defaultPrevented) {
      return;
    }
    const detail = (event as CustomEvent<MobileBackRequestDetail>).detail ?? { source: "browser" as const };
    if (handler(detail)) {
      event.preventDefault();
    }
  };

  window.addEventListener(MOBILE_BACK_REQUEST_EVENT, listener);
  return () => {
    window.removeEventListener(MOBILE_BACK_REQUEST_EVENT, listener);
  };
}
