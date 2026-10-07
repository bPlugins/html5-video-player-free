import "./admin/style.scss";
import isYoutubeURL from "../../wp-utils/v1/isYoutubeURL";
import isVimeoLink from "./utils/isVimeoLink";
// import { Chart } from "chart.js";
(function ($) {
  $(document).ready(function () {
    //Import Data
    $(".h5vp_import_data").on("click", function (e: Event) {
      e.preventDefault();
      $.ajax({
        url: window.h5vpAdmin?.ajaxUrl,
        data: {
          action: "h5vp_import_data_ajax",
        },
        success: (data: string) => {
          const result = JSON.parse(data);
          if (result?.success === true) {
            location.href = location.href + "?h5vp-import=success";
          }
        },
      });
    });

    // Codestar metabox controller
    $(".h5vp_player_type .csf-fieldset .csf--button-group .csf--button").on("click", function (this: HTMLElement) {
      const self = this;
      setTimeout(() => {
        $(".h5vp_player_type_controls").addClass("h5vp_player_controls_click_trigger newclassbro");
        $(".h5vp_player_controls_click_trigger").removeClass("h5vp_player_type_controls");
        const playerType = $(self).parent(".csf--button-group").find(".csf--active input").val();
        $('.h5vp_player_controls_click_trigger .csf-fieldset .csf--button-group .csf--button input[value="' + playerType + '"]')
          .parent()
          .trigger("click");

        $(".h5vp_player_controls_click_trigger").removeClass("h5vp_player_controls_click_trigger");
      }, 100);
      setTimeout(() => {
        $(".newclassbro").addClass("h5vp_player_type_controls");
      }, 1000);
    });

    $(".h5vp_player_type_controls .csf-fieldset .csf--button-group .csf--button").on("click", function (this: HTMLElement) {
      const self = this;
      setTimeout(() => {
        $(".h5vp_player_type").addClass("h5vp_player_click_trigger");
        $(".h5vp_player_controls_click_trigger").removeClass("h5vp_player_type");
        const playerType = $(self).parent(".csf--button-group").find(".csf--active input").val();
        $('.h5vp_player_click_trigger .csf-fieldset .csf--button-group .csf--button input[value="' + playerType + '"]')
          .parent()
          .trigger("click");
        $(".h5vp_player_click_trigger").removeClass("h5vp_player_click_trigger");
      }, 100);
      setTimeout(() => {
        $(".h5vp_player_click_trigger").addClass("h5vp_player_type");
      }, 1000);
    });

    // Handle video source change (Library, Youtube, Vimeo).
    const handleVideoSourceChange = (userInitiated = false) => {
      const $sourceField = $('[data-depend-id="h5vp_video_source"], .csf-field[data-depend-id="h5vp_video_source"]').first();
      let selectedSource = $sourceField.find(".csf--active input").val() as string;
      if (!selectedSource) {
        selectedSource = ($('input[name*="[h5vp_video_source]"]:checked').val() as string) || "";
      }
      if (!selectedSource) return;

      const $urlInput = $('input[name*="[h5vp_video_link_youtube_vimeo]"]');
      if (!$urlInput.length) return;

      const currentUrl = (($urlInput.val() as string) || "").trim();
      const $desc = $urlInput.closest(".csf-field").find(".csf-desc-text");

      const isYoutube = selectedSource === "youtube";
      const isVimeo = selectedSource === "vimeo";
      if (!isYoutube && !isVimeo) return;

      const defaultDesc = isYoutube ? "Youtube video url or ID" : "Vimeo video url or ID";

      if (!userInitiated || !currentUrl) {
        $urlInput.removeClass("h5vp-url-mismatch");
        $desc.removeClass("h5vp-field-warning").text(defaultDesc);
        return;
      }

      const looksValid = isYoutube ? isYoutubeURL(currentUrl) : isVimeoLink(currentUrl);
      $urlInput.toggleClass("h5vp-url-mismatch", !looksValid);

      if (looksValid) {
        $desc.removeClass("h5vp-field-warning").text(defaultDesc);
      } else {
        const warning = isYoutube
          ? "This does not look like a YouTube URL or ID — double check it before saving."
          : "This does not look like a Vimeo URL or ID — double check it before saving.";
        $desc
          .addClass("h5vp-field-warning")
          .html('<span class="dashicons dashicons-warning" aria-hidden="true"></span><span></span>');
        $desc.find("span:last").text(warning);
      }
    };

    $(document).on(
      "click change",
      '[data-depend-id="h5vp_video_source"] .csf--button, input[name*="[h5vp_video_source]"]',
      function () {
        setTimeout(() => handleVideoSourceChange(true), 50);
      }
    );

    // Initial pass on load: label only, never validate/clear a stored value.
    handleVideoSourceChange(false);

    //duplicate player
    $(".h5vp_duplicate_player").on("click", function (this: HTMLElement, event: Event) {
      event.preventDefault();
      $.post(
        h5vpAdmin.ajaxUrl,
        {
          action: "h5vp_dulicate_player",
          postid: $(this).data("postid"),
          security: $(this).attr("security"),
        },
        function (data: any) {
          if (data.success) {

            let location = window.location.href;
            if (location.split("?").length > 1) {
              location = location + "&duplicate=success&h5vp_nonce=" + window.h5vpAdmin.nonce;
            } else {
              location = location + "?duplicate=success&h5vp_nonce=" + window.h5vpAdmin.nonce;
            }
            window.location.href = location;

          } else {
            alert(data.data?.message)
          }
        },
      );
    });

    let url = window.location.href;
    let newUrl = url.search("duplicate=success");
    if (newUrl != -1) {
      window.history.pushState({ urlPath: "edit.php?post_type=videoplayer" }, "", "edit.php?post_type=videoplayer");
    }

    //shortcode copier
    $(document).on("click", ".h5vp_front_shortcode input", function (this: HTMLElement, e: Event) {
      e.preventDefault();

      let shortcode = $(this).parent().find("input")[0];
      shortcode.select();
      shortcode.setSelectionRange(0, 30);
      document.execCommand("copy");
      $(this).parent().find(".htooltip").text("Copied Successfully!");
    });

    $(document).on("mouseout", ".h5vp_front_shortcode input", function (this: HTMLElement) {
      $(this).parent().find(".htooltip").text("Copy To Clipboard");
    });

    // Shortcode copier: the button, its copy icon and the list-table tooltip all show the result for a moment.
    const COPY_RESET_MS = 2000;
    const CHECK_ICON = '<path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';

    const copyToClipboard = async (text: string): Promise<boolean> => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {
        // Permission denied or not focused — fall through to the legacy path.
      }
      const temp = document.createElement("textarea");
      temp.value = text;
      temp.setAttribute("readonly", "");
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      document.body.appendChild(temp);
      temp.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
      document.body.removeChild(temp);
      return copied;
    };

    $(document).on("click", ".h5vp_shortcode_copy_btn", async function (this: HTMLElement, e: Event) {
      e.preventDefault();

      const text = String($(this).data("clipboard-text") ?? "");
      if (!text) return;

      // List-table cell / edit-screen bar group the button with its icon; the Quick Player icon stands alone.
      const $group = $(this).closest(".h5vp_front_shortcode, .shortcode_area");
      const $scope = $group.length ? $group : $(this);
      const $btn = $scope.is("button") ? $scope : $scope.find("button.h5vp_shortcode_copy_btn");
      const $icon = $scope.is("svg") ? $scope : $scope.find("svg.h5vp_shortcode_copy_btn");
      const $tip = $scope.find(".htooltip");

      const copied = await copyToClipboard(text);
      if (!copied) {
        window.prompt("Press Ctrl+C to copy the shortcode:", text);
        return;
      }

      clearTimeout($scope.data("h5vpCopyTimer"));
      if ($scope.data("h5vpIcon") === undefined) {
        $scope.data("h5vpIcon", $icon.html());
      }

      // Keep the button from shrinking when its label switches to the shorter "Copied!".
      $btn.css("min-width", $btn.outerWidth() + "px");
      $btn.text("✓ Copied!");
      $icon.html(CHECK_ICON);
      $tip.text("Copied to clipboard!");
      $scope.addClass("h5vp-copied");

      $scope.data(
        "h5vpCopyTimer",
        setTimeout(() => {
          $scope.removeClass("h5vp-copied");
          $btn.text(String($btn.data("clipboard-text") ?? text));
          $icon.html($scope.data("h5vpIcon"));
          $tip.text("Copy To Clipboard");
        }, COPY_RESET_MS)
      );
    });

    // show/hide password in protected field
    $(".h5vp_show_password").on("click", function (this: HTMLElement) {
      let type = $(this).parent().find("input").attr("type");
      if (type == "password") {
        $(this).parent().find("input").attr("type", "text");
      } else {
        $(this).parent().find("input").attr("type", "password");
      }
    });

    //redirect user page when click on user tr
    $(".h5vp-analytics table tr").on("click", function (this: HTMLElement) {
      const to = this.getAttribute("to");
      const match = location.href.match(/(.+)&page=analytics/g);
      if (to && match) {
        location.href = match[0] + `&${to}`;
      }
    });

    /**
     * Video Analytics
     */

    //initialize chart
    const chart = document.getElementById("myChart");
    // const labels = ["January", "February", "March", "April", "May", "June"];
    const labels = chart && chart.getAttribute("data-labels") && JSON.parse(chart.getAttribute("data-labels")!);
    const value = chart && chart.getAttribute("data-data") && JSON.parse(chart.getAttribute("data-data")!);
    const data = {
      labels,
      datasets: [
        {
          label: "Views",
          backgroundColor: "rgb(255, 99, 132)",
          borderColor: "rgb(255, 99, 132)",
          color: "rgb(255, 99, 132)",
          data: value,
          tension: 0.4,
        },
      ],
    };
    const config = {
      type: "line",
      data,
      options: {},
      plugins: [
        {
          id: chart && chart.getAttribute("id"),
          beforeDraw: (chart: any) => {
            const ctx = chart.canvas.getContext("2d");
            ctx.save();
            ctx.globalCompositeOperation = "destination-over";
            ctx.fillStyle = "#fff";
            // ctx.
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
          },
        },
      ],
    };
    if (chart) {
      var myChart = new Chart(chart, config);
      chart.setAttribute("data-labels", "");
      chart.setAttribute("data-data", "");
      myChart.fillStyle = "#fff";
    }
    //ready end

    //convert srt file
    const convertButton = document.getElementById("h5vp_srt_convert_button");

    if (convertButton) {
      convertButton.onclick = async (e) => {
        e.preventDefault();
        const srtFileInput = document.getElementById("h5vp_srt_file") as HTMLInputElement | null;
        if (!srtFileInput) return;
        const srtFile = srtFileInput.value;
        const result = await fetch(srtFile);
        const blob = await result.blob();
        if (blob) {
          var reader = new FileReader();
          reader.readAsText(blob, "UTF-8");
          reader.onload = function (evt: ProgressEvent<FileReader>) {
            const result = evt.target?.result;
            if (typeof result !== "string") return;
            const content = srt2webvtt(result);
            download(
              srtFile
                .substring(srtFile.lastIndexOf("/") + 1)
                .split(".")
                .slice(0, -1)
                .join(".") + ".vtt",
              content,
            );
            srtFileInput.value = "";
          };
          reader.onerror = function () { };
        }
      };
    }

    function srt2webvtt(data: string) {
      // remove dos newlines
      var srt = data.replace(/\r+/g, "");
      // trim white space start and end
      srt = srt.replace(/^\s+|\s+$/g, "");

      // get cues
      var cuelist = srt.split("\n\n");
      var result = "";

      if (cuelist.length > 0) {
        result += "WEBVTT\n\n";
        for (var i = 0; i < cuelist.length; i = i + 1) {
          result += convertSrtCue(cuelist[i]);
        }
      }

      return result;
    }

    function convertSrtCue(caption: string) {
      // remove all html tags for security reasons
      //srt = srt.replace(/<[a-zA-Z\/][^>]*>/g, '');

      var cue = "";
      var s = caption.split(/\n/);

      // concatenate muilt-line string separated in array into one
      while (s.length > 3) {
        for (var i = 3; i < s.length; i++) {
          s[2] += "\n" + s[i];
        }
        s.splice(3, s.length - 3);
      }

      var line = 0;

      // detect identifier
      if (!s[0].match(/\d+:\d+:\d+/) && s[1].match(/\d+:\d+:\d+/)) {
        cue += s[0].match(/\w+/) + "\n";
        line += 1;
      }
      // return s[line];

      // get time strings
      if (s[line].match(/\d+:\d+:\d+/)) {
        // convert time string
        var m = s[line].match(/(\d+):(\d+):(\d+)(?:,?\.?(\d+))?\s*-?-?>?,?\s*(\d+):(\d+):(\d+)(?:,?\.?(\d+))?/);
        // var m = s[line].match(/(\d+):(\d+):(\d+)(?:,?.?(\d+))?\s*-?-?>?,?\s*(\d+):(\d+):(\d+)(?:,?.?(\d+))?/);
        if (m) {
          cue += m[1] + ":" + m[2] + ":" + m[3] + "." + m[4] + " --> " + m[5] + ":" + m[6] + ":" + m[7] + "." + m[8] + "\n";
          line += 1;
        } else {
          // Unrecognized timestring
          return "";
        }
      } else {
        // file format error or comment lines
        return "";
      }

      // get cue text
      if (s[line]) {
        cue += s[line];
        if (s[line + 1]) {
          cue += "\n";
          cue += s[line + 1] + "\n\n";
        } else {
          cue += "\n\n";
        }
      }
      return cue;
    }

    function download(filename: string, text: string) {
      var element = document.createElement("a");
      element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
      element.setAttribute("download", filename);

      element.style.display = "none";
      document.body.appendChild(element);

      element.click();

      document.body.removeChild(element);
    }

    const exportButtons = document.querySelectorAll(".h5vp_export_button");
    Object.values(exportButtons).map((item) => {
      const id = item.getAttribute("data-id")!;
      item.addEventListener("click", function (e) {
        e.preventDefault();
        $.ajax({
          url: h5vpAdmin?.ajaxUrl,
          data: {
            action: "h5vp_export_data",
            id,
            nonce: h5vpAdmin?.nonce,
          },
          method: "POST",
          success: (result: string) => {
            const url = window.URL.createObjectURL(new Blob([result], { type: "application/json" }));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `video-player-${id}.json`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          },
        });
      });
    });

    //import better

    const formWrapper = document.querySelector(".h5vp_import_form") as HTMLDivElement;
    if (!formWrapper) return;
    const form = formWrapper.querySelector("form") as HTMLFormElement;
    const closeBtn = formWrapper.querySelector(".close") as HTMLButtonElement;
    const notice = formWrapper.querySelector(".h5vp-import-notice") as HTMLDivElement;
    closeBtn?.addEventListener("click", function () {
      formWrapper.style.display = "none";
    });

    form?.addEventListener("submit", function (e) {
      e.preventDefault();
      const fileInput = form.querySelector(".h5vp_import_file") as HTMLInputElement;
      if (fileInput.files && fileInput.files[0]) {
        var reader = new FileReader();
        reader.readAsText(fileInput.files[0], "UTF-8");
        reader.onload = function (e: ProgressEvent<FileReader>) {
          const content = e.target?.result;
          $.ajax({
            url: h5vpAdmin?.ajaxUrl,
            data: {
              action: "h5vp_import_data",
              id: null,
              content,
            },
            method: "POST",
            success: () => {
              notice.style.display = "block";
              fileInput.value = "";
              setTimeout(() => {
                if (window.importReload) {
                  window.location.reload();
                }
                formWrapper.style.display = "none";
              }, 1000);
            },
          });
        };
        reader.onerror = function () {
          console.warn("error importing");
        };
      }
    });

    const importButtons = document.querySelectorAll(".h5vp_import_button");
    Object.values(importButtons).map((item) => {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        window.id = item.getAttribute("data-id")!;
        window.importReload = item.getAttribute("data-reload")!;
        notice.style.display = "none";
        formWrapper.style.display = "block";
      });
    });
  });
})(jQuery);

export function setCookie(cookieName: string, cookieValue: string, expiryInSeconds: number) {
  var expiry = new Date();
  expiry.setTime(expiry.getTime() + 1000 * expiryInSeconds);
  document.cookie = cookieName + "=" + escape(cookieValue) + ";expires=" + expiry.toUTCString() + ";path=/";
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    // send ajax request to dismiss notice with class '.h5vp_notice_aws_notice'
    document.querySelectorAll(".h5vp_aws_notice .notice-dismiss").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const notice = item.closest(".h5vp_aws_notice");
        const nonce = notice?.getAttribute("data-nonce")!;

        const data = {
          nonce,
        };

        if (window.wp.ajax) {
          wp.ajax.post("h5vp_dismiss_aws_notice", data).then(() => {
            notice?.remove();
          });
        }
      });
    });
  }, 100);
});
