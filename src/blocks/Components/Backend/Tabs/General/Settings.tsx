import { useEffect, useState } from "react";
import { TextControl, SelectControl, PanelBody, RangeControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

import isYoutubeURL from "../../../../../../../wp-utils/v1/isYoutubeURL";
import Notice from "./../../../../../../../bpl-tools/Components/Notice";
import BToggleControl from "../../BToggleControl";
import { helpText } from "../../../../../utils/constant";
import SettingsIcon from "../../../../../icons/Settings";
import Title from "../Title";

import type { BlockAttributes } from "../../../../types";

interface SettingsProps {
  attributes: BlockAttributes;
  setAttributes: (attrs: Partial<BlockAttributes>) => void;
  handleOptions: (value: Record<string, any>, type?: string | null) => void;
  name?: string;
}

const Settings = ({ attributes, setAttributes, handleOptions }: SettingsProps) => {
  const { source, provider, options, presetId } = attributes;
  const { autoplay, muted, hideControls, playsinline, preload, ratio, resetOnEnd, loop, speed, defaultVolume, fit } = options;

  const [isCustomRatio, setIsCustomRatio] = useState(false);

  useEffect(() => {
    if (isYoutubeURL(source)) {
      setAttributes({ library: "youtube" } as any);
    }
  }, [source]);


  return (
    <PanelBody title={<Title title={__("Settings", "html5-video-player")} Icon={SettingsIcon} /> as unknown as string} initialOpen={false} className="bPlPanelBody">
      <BToggleControl info={helpText.autoplay} help={autoplay ? __("muted should be enabled", "html5-video-player") : ""} label={__("Autoplay", "html5-video-player")} id="autoplay" checked={autoplay} onChange={() => handleOptions({ autoplay: !autoplay })} />

      <BToggleControl info={helpText.muted} label={__("Muted", "html5-video-player")} checked={muted} onChange={() => handleOptions({ muted: !muted })} />

      {!muted && (
        <div style={{ margin: "14px 0" }}>
          <BToggleControl
            info={__("The volume the video starts at, from 0 to 100. Leave empty to keep the default. If Muted is on, the video stays muted.", "html5-video-player")}
            Component={RangeControl}
            label={__("Default Volume (%)", "html5-video-player")}
            isNew
            value={defaultVolume === "" || defaultVolume === undefined ? undefined : Number(defaultVolume)}
            min={0}
            max={100}
            step={5}
            allowReset
            initialPosition={50}
            onChange={(value: number | undefined) => handleOptions({ defaultVolume: value === undefined ? "" : value })}
          />
        </div>
      )}

      <BToggleControl info={helpText.repeat} label={__("Repeat", "html5-video-player")} checked={loop.active} onChange={() => handleOptions({ loop: { ...loop, active: !loop.active } })} />

      {!loop.active && !presetId && <BToggleControl info={helpText.resetOnEnd} label={__("Reset On End", "html5-video-player")} checked={resetOnEnd} onChange={() => handleOptions({ resetOnEnd: !resetOnEnd })} />}

      {!presetId && <BToggleControl info={helpText.autoHideControls} label={__("Auto Hide Control", "html5-video-player")} checked={hideControls} onChange={() => handleOptions({ hideControls: !hideControls })} />}

      <BToggleControl info={helpText.playsinline} label={__("Allow inline playback on iOS", "html5-video-player")} checked={playsinline} onChange={() => handleOptions({ playsinline: !playsinline })} />

      {/* preload is a <video> attribute, so it has no effect on the YouTube/Vimeo iframe embeds. */}
      {!presetId && !["youtube", "vimeo"].includes(provider) && (
        <BToggleControl
          info={helpText.preload}
          Component={SelectControl}
          labelPosition="side"
          // Blocks saved before Preload was exposed have no options.preload;
          // show the effective default instead of a phantom selection.
          value={preload || "metadata"}
          label={__("Preload", "html5-video-player")}
          options={[
            { label: "none", value: "none" },
            { label: "metadata", value: "metadata" },
            { label: "auto", value: "auto" },
          ]}
          onChange={(preload: string) => handleOptions({ preload })}
        />
      )}

      <BToggleControl
        info={helpText.videoRatio}
        Component={SelectControl}
        labelPosition="top"
        value={isCustomRatio ? "custom" : ratio}
        label={__("Video Ratio (Aspect Ratio)", "html5-video-player")}
        options={[
          { label: "Original", value: "original" },
          { label: "Square (1:1)", value: "1:1" },
          { label: "Standard (4:3)", value: "4:3" },
          { label: "Widescreen (16:9)", value: "16:9" },
          { label: "Panoramic (21:9)", value: "21:9" },
          { label: "Portrait (3:4)", value: "3:4" },
          { label: "Classic (3:2)", value: "3:2" },
          { label: "Classic Portrait (2:3)", value: "2:3" },
          { label: "Tall (9:16)", value: "9:16" },
          { label: "Custom", value: "custom" },
        ]}
        onChange={(ratio: string) => {
          if (ratio === "custom") {
            setIsCustomRatio(true);
          } else {
            setIsCustomRatio(false);
            handleOptions({ ratio });
          }
        }}
      />

      <div style={{ margin: "14px 0" }}>
        <BToggleControl
          info={__("Fit shows the whole video (black bars if the shapes differ). Fill covers the whole frame and crops the edges. It needs a fixed Video Ratio above; with Original there is nothing to crop.", "html5-video-player")}
          Component={SelectControl}
          labelPosition="top"
          value={fit === "cover" ? "cover" : "contain"}
          label={__("Video Fit", "html5-video-player")}
          isNew
          options={[
            { label: __("Fit (show the whole video)", "html5-video-player"), value: "contain" },
            { label: __("Fill (crop to the frame)", "html5-video-player"), value: "cover" },
          ]}
          onChange={(value: string) => handleOptions({ fit: value })}
        />
      </div>

      {isCustomRatio && (
        <BToggleControl
          info={helpText.videoRatio}
          Component={TextControl}
          label={__("Custom Video Ratio", "html5-video-player")}
          help="Original - blank, Square - 1:1, Standard - 4:3, Portrait - 3:4, Classic - 3:2, Classic Portrait - 2:3, Wide - 16:9, Tall - 9:16"
          onChange={(ratio: string) => handleOptions({ ratio })}
          value={ratio}
          placeholder={"16:9"}
          autoComplete={false}
        />
      )}

      <BToggleControl
        info={__("The speed options to display in the UI. YouTube and Vimeo will ignore any options outside of the 0.5-2 range, so options outside of this range will be hidden automatically.", "html5-video-player")}
        Component={TextControl}
        label={__("Speed", "html5-video-player")}
        value={speed.options}
        onChange={(options: string) => handleOptions({ ...speed, options: options.split(",") }, "speed")}
      />

      <Notice status="premium" isIcon={true}>
        <h3>
          {__("Premium Features", "html5-video-player")}
        </h3>
        {/* write the pro feature list in this panel . ul li */}
        <ul>
          <li>{__("Autoplay when visible", "html5-video-player")}</li>
          <li>{__("Save playback state", "html5-video-player")}</li>
          <li>{__("Stick on scroll", "html5-video-player")}</li>
          <li>{__("Seektime", "html5-video-player")}</li>
          <li>{__("Start time", "html5-video-player")}</li>
          <li>{__("Custom play button", "html5-video-player")}</li>
          <li>{__("Ads", "html5-video-player")}</li>
          <li>{__("6 new player skin/theme", "html5-video-player")}</li>
        </ul>
      </Notice>

    </PanelBody>
  );
};

export default Settings;
