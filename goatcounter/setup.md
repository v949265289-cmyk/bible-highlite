# Visit counter setup

The site is hosted on GitHub Pages, so it needs a hosted counter to share one total across visitors. This uses GoatCounter to count page views without cookies or storing IP addresses.

1. Create a GoatCounter site at [goatcounter.com](https://www.goatcounter.com/).
2. Set its site URL to `https://v949265289-cmyk.github.io/bible-highlite/`.
3. In the GoatCounter site settings, enable **Allow adding visitor counts on your website**.
4. Copy the site code—the part before `.goatcounter.com`—into `goatCounterCode` in `site-config.js`.
5. Publish the site changes. The page will then track visits and show the all-time total.

No API key or password is needed in the website code. The counter reports page views, not verified unique people, and GoatCounter may cache the displayed total for up to four hours. Its hosted script receives each counted page view; see the [GoatCounter privacy policy](https://www.goatcounter.com/help/privacy).
