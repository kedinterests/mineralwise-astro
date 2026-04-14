/// <reference types="astro/client" />

declare namespace App {
	interface Locals {
		showCookieBanner: boolean;
		cookieConsentValue: string | undefined;
	}
}
