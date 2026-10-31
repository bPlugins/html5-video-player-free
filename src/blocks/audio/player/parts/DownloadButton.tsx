import { __ } from "@wordpress/i18n";
import { IconDownload } from "./Icons";
import { safeUrl } from "../../../../utils/playerSecurity";

/** Save-the-file link. Anchor rather than button so the browser owns the save. */
const DownloadButton = ({ source }: { source: string }) => (
    <a
        className="h5vp-btn h5vp-btn-download"
        href={safeUrl(source)}
        download
        title={__("Download", "html5-video-player")}
        aria-label={__("Download Audio", "html5-video-player")}
    >
        <IconDownload />
    </a>
);

export default DownloadButton;
