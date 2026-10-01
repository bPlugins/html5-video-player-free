import { __ } from "@wordpress/i18n";
import { useState, useRef, useEffect } from "react";
import { produce } from "immer";
import { TabPanel, Panel, ToolbarGroup, ToolbarButton } from "@wordpress/components";
import { BlockControls, InspectorControls } from "@wordpress/block-editor";

import BControls from "./BControls";
import Settings from "./Tabs/General/Settings";
import panelBodyController from "../../../../../wp-utils/v1/panelBodyController";

import RefactorDataStructure from "./RefactorDataStructure";

import isYoutubeURL from "../../../../../wp-utils/v1/isYoutubeURL";
import { extractFileNamesWithoutExtension } from "../../../public/MyPlayer";

import isVimeoLink from "../../../utils/isVimeoLink";

import "./../editor.scss";
import Media from "./Tabs/General/Media";
import Subtitle from "./Tabs/General/Subtitle";
import Style from "./Tabs/Style";
import Presets from "./Tabs/General/Presets";

import CopyShortcode from "./CopyShortcode";

import type { BlockAttributes } from "../../types";
import useWPAjax from "src/hooks/useWPAjax";
import PremiumPanel from "../../../../../bpl-tools/ProControls/PremiumPanel";

interface BSettingsProps {
  attributes: BlockAttributes;
  setAttributes: (attrs: Partial<BlockAttributes>) => void;
  clientId: string;
  name: string;
}

const BSettings = ({ attributes, setAttributes, clientId, name }: BSettingsProps) => {
  const { source, provider, uniqueId } = attributes;

  const { refetch } = useWPAjax("h5vp_ajax_handler", { nonce: window.h5vpBlock?.editorNonce, method: "create", model: "Video" }, true);
  const [videoSource, setVideoSource] = useState(provider === "library" ? "self-hosted" : provider);

  useEffect(() => {
    if (!uniqueId) {
      setAttributes({ uniqueId: `h5vp${clientId.substr(0, 8)}` });
    }
  }, []);

  const panelRef = useRef<HTMLDivElement>(null);

  const updateOption = (value: Record<string, any>, type: string | null = null) => {
    updateHandler(value, type, "options");
  };

  const updateFeatures = (value: Record<string, any>, type: string | null = null) => {
    updateHandler(value, type, "features");
  };

  const updateHandler = (value: Record<string, any>, type: string | null, attr: string) => {
    setAttributes({
      [attr]: produce((attributes as any)[attr], (draft: any) => {
        Object.keys(value).map((key) => {
          if (type) {
            if (draft[type]) {
              draft[type][key] = value[key];
            } else {
              draft[type] = { [key]: value[key] };
            }
          } else {
            draft[key] = value[key];
          }
        });
      }),
    });
  };



  useEffect(() => {
    if (!videoSource) {
      if (isYoutubeURL(source)) {
        setVideoSource("youtube");
      } else if (isVimeoLink(source)) {
        setVideoSource("vimeo");
      } else {
        setVideoSource("self-hosted");
      }
    }
  }, [source]);

  useEffect(() => {
    if (source && videoSource) {
      refetch({ src: source, type: videoSource, title: extractFileNamesWithoutExtension(source) });
    }
  }, [source, videoSource]);

  const props = { attributes, setAttributes, updateFeatures, handleFeatures: updateFeatures };

  return (
    <>
      <InspectorControls>
        <CopyShortcode />
        <TabPanel
          className="bPlTabPanel h5vpTabPanel"
          activeClass="active-tab activeTab"
          onSelect={panelBodyController}
          tabs={[
            { name: "general", title: "General" },
            { name: "controls", title: "Controls" },
            { name: "style", title: "Style" },
          ]}
        >
          {(tab) => (
            <>
              <RefactorDataStructure attributes={attributes} setAttributes={setAttributes} />
              {tab.name == "general" && (
                <>
                  <Panel>
                    <Media {...props} />
                    <Subtitle {...props} />
                    <Settings name={name} {...props} handleOptions={updateOption} />
                    <Presets {...props} presetId={attributes.presetId} />


                  </Panel>
                </>
              )}
              {tab.name == "controls" && <BControls attributes={attributes} setAttributes={setAttributes} updateOption={updateOption} />}
              {tab.name == "style" && (
                <>
                  <Style panelRef={panelRef as React.RefObject<HTMLDivElement>} {...props} updateHandler={updateHandler} />
                </>
              )}
            </>
          )}
        </TabPanel>
        <hr />
        <PremiumPanel description="Multiple Subtitles, Popup, Watermark, SEO, Overlay, Protection is available in premium version" title="Premium Features" pricingUrl={window.h5vpBlock.adminUrl + `edit.php?post_type=videoplayer&page=html5-video-player#/pricing`} buttonLabel="Get Pro">{' '}</PremiumPanel>
        <br />
      </InspectorControls>
      <BlockControls>
        <ToolbarGroup>
          <ToolbarButton icon={"edit"} label="Reset" onClick={() => setAttributes({ source: "" })} />
        </ToolbarGroup>
      </BlockControls>
    </>
  );
};

export default BSettings;
