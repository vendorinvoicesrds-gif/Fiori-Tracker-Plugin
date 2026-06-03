sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/odata/v2/ODataModel"
], function (UIComponent, ODataModel) {
    "use strict";

    // ── CONFIGURATION ─────────────────────────────────────────────────────────
    // OData V2 service path — matches your registered service
    var SRV_PATH = "/sap/opu/odata/sap/ZFTX_FIORI_TRACKER_SRV/";
    var ENTITY = "Create_logSet"; // ⚠ change to your actual EntitySet name

    // Navigation noise to suppress
    var SKIP_SEMANTIC_OBJECTS = ["Shell", "Launchpad", "Action"];

    return UIComponent.extend("com.tecnics.fioritracker.plugin.Component", {

        metadata: {
            manifest: "json"
        },

        // ── Lifecycle ──────────────────────────────────────────────────────────
        init: function () {
            // Call base init ONLY — no router, no device model, no views
            UIComponent.prototype.init.apply(this, arguments);

            var oModel = new ODataModel(
                SRV_PATH,
                {
                    json: true,
                    useBatch: false,
                    defaultBindingMode: "TwoWay"
                }
            );



            this.setModel(oModel);

            this._postPromise = Promise.resolve();

            console.log("Fiori Tracker Plugin Initialized");

            this._lastIntentHash = "";
            this._lastLaunchTime = 0;

            this._attachListeners();
        },

        // ── Event listener with Container readiness guard ──────────────────────
        _attachListeners: function () {
            var self = this;
            if (self._bListenerAttached) {
                return;
            }

            function doAttach() {
                try {
                    if (!window.sap || !sap.ushell || !sap.ushell.Container) {
                        setTimeout(doAttach, 300);
                        return;
                    }

                    sap.ushell.Container.getServiceAsync("AppLifeCycle")
                        .then(function (oService) {

                            if (
                                oService &&
                                oService.attachAppLoaded &&
                                !self._bListenerAttached
                            ) {

                                self._bListenerAttached = true;

                                oService.attachAppLoaded(
                                    self._onAppOpened.bind(self)
                                );
                            }
                        })

                } catch (e) {
                    setTimeout(doAttach, 300);
                }
            }

            doAttach();
        },

        // ── Main handler ───────────────────────────────────────────────────────
        // _onAppOpened: function (oEvent) {
        //     // attachAppLoaded delivers: { oApplication: { componentInstance, appId, ... } }
        //     var oApp = (oEvent && oEvent.oApplication) || oEvent || {};
        //     var oParams = {
        //         appId: oApp.appId || "",
        //         tileId: oApp.tileId || ""
        //     };

        //     var oIntent = this._parseHash(window.location.hash);

        //     if (!oIntent.semanticObject) { return; }
        //     if (SKIP_SEMANTIC_OBJECTS.indexOf(oIntent.semanticObject) !== -1) {
        //         return;
        //     }

        //     // Resolve real App ID — prefer manifest over event param
        //     var sAppId = "";
        //     try {
        //         if (oApp.componentInstance) {
        //             var oSapApp = oApp.componentInstance.getManifestEntry("sap.app");
        //             if (oSapApp && oSapApp.id) { sAppId = oSapApp.id; }
        //         }
        //     } catch (e) { /* fall through */ }

        //     if (!sAppId && oParams.appId && !this._looksLikeHash(oParams.appId)) {
        //         sAppId = oParams.appId;
        //     }

        //     var sIntentHash = oIntent.full ||
        //         (oIntent.semanticObject && oIntent.action
        //             ? "#" + oIntent.semanticObject + "-" + oIntent.action
        //             : "");

        //     this._postOData({
        //         app_id: sAppId,
        //         tile_id: oParams.tileId,
        //         semantic_object: oIntent.semanticObject,
        //         action_name: oIntent.action,
        //         intent_hash: sIntentHash,
        //         event_type: "APP_LAUNCH",
        //         device_type: this._device(),
        //         browser: this._browser(),
        //         session_id: this._session()
        //     });
        // },

        // ── Main handler ───────────────────────────────────────────────────────
        _onAppOpened: function (oEvent) {
            var p = oEvent.getParameters();


            var sHash = window.location.hash;

            if (
                this._lastIntentHash === sHash &&
                (Date.now() - this._lastLaunchTime) < 1500
            ) {
                return;
            }

            this._lastIntentHash = sHash;
            this._lastLaunchTime = Date.now();

            var oApp1 = sap.ushell.Container
                .getService("AppLifeCycle")
                .getCurrentApplication();

            var oComponent = oApp1.componentInstance;

            var oManifest = oComponent.getMetadata().getManifest();

            // -----------------------------
            // sap.app
            // -----------------------------
            var sapApp = oManifest["sap.app"] || {};

            // -----------------------------
            // sap.fiori
            // -----------------------------
            var sapFiori = oManifest["sap.fiori"] || {};

            // -----------------------------
            // sap.ui5
            // -----------------------------
            var sapUi5 = oManifest["sap.ui5"] || {};

            // Registration ID (F2691)
            var sRegistrationId =
                sapFiori.registrationIds &&
                    sapFiori.registrationIds.length > 0
                    ? sapFiori.registrationIds[0]
                    : "";

            // App Title
            var sTitle = sapApp.title || "";

            // Description
            var sDescription = sapApp.description || "";

            // Component ID
            var sComponentId = sapApp.id || "";

            // UI5 Component Name
            var sComponentName = sapUi5.componentName || "";

            // App Type
            var sType = sapApp.type || "";

            // Ach / Business Area
            var sAch = sapApp.ach || "";

            // Main OData Service
            var sMainService =
                sapApp.dataSources &&
                    sapApp.dataSources.mainService
                    ? sapApp.dataSources.mainService.uri
                    : "";

            // App Version
            var sVersion =
                sapApp.applicationVersion
                    ? sapApp.applicationVersion.version
                    : "";

            // ArcheType
            var sArcheType = sapFiori.archeType || "";

            console.log({
                registrationId: sRegistrationId,
                title: sTitle,
                description: sDescription,
                componentId: sComponentId,
                componentName: sComponentName,
                type: sType,
                ach: sAch,
                mainService: sMainService,
                version: sVersion,
                archeType: sArcheType
            });


            var sAppTitle = "";
            var sTileTitle = "";

            try {

                // Current application object
                var oApp = sap.ushell.Container.getService("AppLifeCycle")
                    .getCurrentApplication();

                // App title from manifest / metadata
                sAppTitle =
                    oApp?.componentInstance
                        ?.getMetadata()
                        ?.getManifestEntry("sap.app")
                        ?.title || "";

            } catch (e) { }

            try {

                // Tile title from renderer
                var oRenderer = sap.ushell.Container.getRenderer();

                if (oRenderer && p.tileId) {

                    var oTile = sap.ui.getCore().byId(p.tileId);

                    if (oTile && oTile.getTitle) {
                        sTileTitle = oTile.getTitle();
                    }
                }

            } catch (e) { }


            var oApp = (oEvent && oEvent.oApplication) || oEvent || {};
            var oIntent = this._parseHash(window.location.hash);

            if (!oIntent.semanticObject) { return; }
            if (SKIP_SEMANTIC_OBJECTS.indexOf(oIntent.semanticObject) !== -1) { return; }

            var self = this;

            // Try manifest first (fastest, most accurate)
            var sAppId = "";
            try {
                if (oApp.componentInstance) {
                    var oSapApp = oApp.componentInstance.getManifestEntry("sap.app");
                    if (oSapApp && oSapApp.id) { sAppId = oSapApp.id; }
                }
            } catch (e) { /* fall through */ }

            if (sAppId) {
                // We already have a clean App ID — post immediately
                self._buildAndPost(sAppId, "", oIntent, oApp);
            } else {
                // Fall back: resolve via CSTR from the semantic object + action
                self._resolveAppIdFromIntent(oIntent, function (sResolvedId, sTileId) {
                    self._buildAndPost(sAppTitle, sTileId, oIntent, oApp);
                });
            }
        },

        // ── Build payload and POST ─────────────────────────────────────────────
        _buildAndPost: function (sAppId, sTileId, oIntent, oApp) {
            this._postOData({
                app_id: sAppId,
                tile_id: sTileId,
                semantic_object: oIntent.semanticObject,
                action_name: oIntent.action,
                intent_hash: oIntent.full,
                event_type: "APP_LAUNCH",
                device_type: this._device(),
                browser: this._browser(),
                session_id: this._session()
            });
        },

        // ── Resolve App ID from intent hash via CSTR ───────────────────────────
        // CSTR resolves #SemanticObject-action to the full target, which contains
        // the real sap.app/id. This is the most reliable fallback available.
        _resolveAppIdFromIntent: function (oIntent, fnCallback) {
            try {
                sap.ushell.Container.getServiceAsync("ClientSideTargetResolution")
                    .then(function (oCSTR) {
                        var sIntent = oIntent.semanticObject + "-" + oIntent.action;
                        return oCSTR.resolveSapSystemHash(sIntent)
                            .catch(function () {
                                // resolveSapSystemHash not available on all versions
                                return oCSTR.resolveHashFragment("#" + sIntent);
                            });
                    })
                    .then(function (oResolved) {
                        var sAppId = "";
                        var sTileId = "";

                        if (oResolved) {
                            // Path 1: additionalInformation contains "SAPUI5.Component=<app.id>"
                            var sInfo = oResolved.additionalInformation || "";
                            var oMatch = sInfo.match(/SAPUI5\.Component=([^\s&]+)/);
                            if (oMatch) { sAppId = oMatch[1]; }

                            // Path 2: applicationType / url give a hint in some systems
                            if (!sAppId && oResolved.url) {
                                var sUrl = oResolved.url;
                                // e.g. /sap/bc/ui5_ui5/sap/F0842A/  → extract F0842A style
                                var oUrlMatch = sUrl.match(/\/([A-Z][A-Z0-9_\-]+)\/?$/);
                                if (oUrlMatch) { sAppId = oUrlMatch[1]; }
                            }

                            // Path 3: sap-ui-tech-hint or id field (FLP 7.xx+)
                            if (!sAppId && oResolved.id) { sAppId = oResolved.id; }

                            sTileId = oResolved.tileId || oResolved.id || "";
                        }

                        fnCallback(sAppId, sTileId);
                    })
                    .catch(function () {
                        // CSTR failed entirely — post with semantic object as fallback
                        fnCallback("", "");
                    });

            } catch (e) {
                fnCallback("", "");
            }
        },

        // ── OData V2 POST ──────────────────────────────────────────────────────
        // Uses XMLHttpRequest so we get the CSRF token flow without any
        // dependency on sap.ui.model — works even before models are ready.
        // _postOData: function (oPayload) {
        //     var sBase = SRV_PATH;
        //     var self = this;

        //     // Step 1: fetch CSRF token
        //     var oTokenReq = new XMLHttpRequest();
        //     oTokenReq.open("GET", sBase + "?$top=1", true);
        //     oTokenReq.setRequestHeader("X-CSRF-Token", "Fetch");
        //     oTokenReq.setRequestHeader("Accept", "application/json");

        //     oTokenReq.onreadystatechange = function () {
        //         if (oTokenReq.readyState !== 4) { return; }

        //         var sToken = oTokenReq.getResponseHeader("X-CSRF-Token") || "";

        //         // Step 2: POST the event
        //         var oPostReq = new XMLHttpRequest();
        //         oPostReq.open("POST", sBase + ENTITY, true);
        //         oPostReq.setRequestHeader("Content-Type", "application/json");
        //         oPostReq.setRequestHeader("Accept", "application/json");
        //         oPostReq.setRequestHeader("X-CSRF-Token", sToken);
        //         oPostReq.setRequestHeader("X-Requested-With", "XMLHttpRequest");

        //         // Fire-and-forget — silent on error
        //         oPostReq.send(JSON.stringify(oPayload));
        //     };

        //     oTokenReq.send();
        // },

        // _postOData: function (oPayload) {

        //     if (this.is_posted) {
        //         return;
        //     }

        //     var oModel = this.getModel();

        //     if (!oModel) {
        //         return;
        //     }

        //     oModel.create(
        //         "/" + ENTITY,
        //         oPayload,
        //         {

        //             async: true,

        //             success: function () {

        //                 console.log(
        //                     "Usage Logged Successfully"
        //                 );
        //             },

        //             error: function (oError) {

        //                 console.error(
        //                     "Usage Logging Failed",
        //                     oError
        //                 );
        //             }
        //         }
        //     );

        // },


        _postOData: function (oPayload) {

            var oModel = this.getModel();

            if (!oModel) {
                return Promise.resolve();
            }

            this._postPromise = this._postPromise.then(function () {

                return new Promise(function (resolve) {

                    oModel.create(
                        "/" + ENTITY,
                        oPayload,
                        {
                            async: true,

                            success: function () {
                                console.log("Usage Logged Successfully");
                                resolve();
                            },

                            error: function (oError) {
                                console.error(
                                    "Usage Logging Failed",
                                    oError
                                );
                                resolve();
                            }
                        }
                    );

                });

            });

            return this._postPromise;
        },

        // ── Hash parser ────────────────────────────────────────────────────────
        _parseHash: function (sRawHash) {
            var result = { semanticObject: "", action: "", full: "" };
            if (!sRawHash || sRawHash === "#" || sRawHash === "") {
                return result;
            }
            var s = sRawHash.replace(/^#/, "");
            var sClean = s.split("?")[0].split("~")[0];
            result.full = "#" + sClean;
            var nDash = sClean.indexOf("-");
            if (nDash > 0) {
                result.semanticObject = sClean.substring(0, nDash);
                result.action = sClean.substring(nDash + 1);
            } else {
                result.semanticObject = sClean;
                result.action = "";
            }
            return result;
        },

        // ── App ID resolver ────────────────────────────────────────────────────
        _resolveAppId: function (oParams) {
            try {
                var oALC = sap.ushell.Container.getService("AppLifeCycle");
                var oCurrent = oALC.getCurrentApplication();
                if (oCurrent) {
                    if (oCurrent.componentInstance) {
                        var oSapApp = oCurrent.componentInstance
                            .getManifestEntry("sap.app");
                        if (oSapApp && oSapApp.id) { return oSapApp.id; }
                    }
                    if (oCurrent.appId) { return oCurrent.appId; }
                }
            } catch (e) { /* fall through */ }

            var sParamId = oParams.appId || "";
            if (sParamId && !this._looksLikeHash(sParamId)) {
                return sParamId;
            }
            return "";
        },

        _looksLikeHash: function (s) {
            if (!s) { return false; }
            if (s.indexOf("?") !== -1 || s.indexOf("pageId=") !== -1) {
                return true;
            }
            // Slash is a hash signal only if the string starts lowercase or digit
            if (s.indexOf("/") !== -1 && /^[a-z0-9]/.test(s)) { return true; }
            return false;
        },

        // ── Device / Browser / Session ─────────────────────────────────────────
        _device: function () {
            var ua = navigator.userAgent;
            if (/ipad|tablet/i.test(ua)) { return "Tablet"; }
            if (/mobile|android|iphone/i.test(ua)) { return "Mobile"; }
            return "Desktop";
        },

        _browser: function () {
            var ua = navigator.userAgent;
            if (ua.indexOf("Edg") !== -1) { return "Edge"; }
            if (ua.indexOf("Chrome") !== -1) { return "Chrome"; }
            if (ua.indexOf("Firefox") !== -1) { return "Firefox"; }
            if (ua.indexOf("Safari") !== -1) { return "Safari"; }
            return "Other";
        },

        _session: function () {
            if (!window._zftxSid) {
                window._zftxSid = "S" + Date.now().toString(36) +
                    Math.random().toString(36).substring(2, 6).toUpperCase();
            }
            return window._zftxSid;
        }

    });
});



// sap.ui.define([
//     "sap/ui/core/UIComponent",
//     "sap/ui/model/odata/v2/ODataModel",
//     "sap/ui/Device"
// ], function (
//     UIComponent,
//     ODataModel,
//     Device
// ) {

//     "use strict";

//     var SRV_PATH =
//         "/sap/opu/odata/sap/ZFTX_FIORI_TRACKER_SRV/";

//     var ENTITY_SET =
//         "/Create_logSet";

//     var SKIP_SEMANTIC_OBJECTS = [
//         "Shell",
//         "Launchpad",
//         "Action"
//     ];

//     return UIComponent.extend(
//         "com.tecnics.fioritracker.plugin.Component", {

//         metadata: {
//             manifest: "json"
//         },

//         /* =========================================================== */
//         /* INIT                                                        */
//         /* =========================================================== */

//         init: function () {

//             UIComponent.prototype.init.apply(
//                 this,
//                 arguments
//             );

//             /*
//              * OData V2 Model
//              */

//             var oModel = new ODataModel(
//                 SRV_PATH,
//                 {
//                     json: true,
//                     useBatch: false,
//                     defaultBindingMode: "TwoWay"
//                 }
//             );

//             this.setModel(oModel);

//             /*
//              * Runtime variables
//              */

//             this.UserTiles = [];
//             this._lastHash = "";

//             /*
//              * Wait for FLP renderer
//              */

//             this._getRenderer()
//                 .then(function () {

//                     console.log(
//                         "Fiori Tracker Plugin Loaded"
//                     );

//                     this._prepareTileCache();
//                     this._subscribeEvents();

//                 }.bind(this))

//                 .catch(function (err) {

//                     console.error(
//                         "Renderer Init Failed",
//                         err
//                     );
//                 });
//         },

//         /* =========================================================== */
//         /* BUILD TILE CACHE                                            */
//         /* =========================================================== */

//         _prepareTileCache: function () {

//             var that = this;

//             try {

//                 sap.ushell.Container
//                     .getService("LaunchPage")
//                     .getGroups()

//                     .then(function (aGroups) {

//                         for (var i = 0; i < aGroups.length; i++) {

//                             var aTiles =
//                                 sap.ushell.Container
//                                 .getService("LaunchPage")
//                                 .getGroupTiles(aGroups[i]);

//                             for (var j = 0; j < aTiles.length; j++) {

//                                 var oTile = aTiles[j];

//                                 var sTileTitle =
//                                     sap.ushell.Container
//                                     .getService("LaunchPage")
//                                     .getTileTitle(oTile);

//                                 var sTileTarget =
//                                     sap.ushell.Container
//                                     .getService("LaunchPage")
//                                     .getCatalogTileTargetURL(oTile);

//                                 var sGroupTitle =
//                                     sap.ushell.Container
//                                     .getService("LaunchPage")
//                                     .getGroupTitle(aGroups[i]);

//                                 if (!sTileTarget) {
//                                     continue;
//                                 }

//                                 if (
//                                     sTileTitle &&
//                                     sTileTitle.indexOf("App Launcher") === 0
//                                 ) {
//                                     sTileTitle = sTileTarget;
//                                 }

//                                 var sHash =
//                                     that._extractHash(
//                                         sTileTarget
//                                     );

//                                 that.UserTiles.push({

//                                     appTitle:
//                                         sTileTitle || "",

//                                     groupTitle:
//                                         sGroupTitle || "",

//                                     targetHash:
//                                         sHash || "",

//                                     tileId:
//                                         oTile.getId ?
//                                         oTile.getId() : "",

//                                     catalogId:
//                                         oTile._oCatalogTile &&
//                                         oTile._oCatalogTile.catalogId ?
//                                         oTile._oCatalogTile.catalogId :
//                                         ""
//                                 });
//                             }
//                         }

//                         console.log(
//                             "Tile Cache Ready:",
//                             that.UserTiles.length
//                         );
//                     });

//             } catch (e) {

//                 console.error(
//                     "Tile Cache Failed",
//                     e
//                 );
//             }
//         },

//         /* =========================================================== */
//         /* EVENT SUBSCRIPTION                                          */
//         /* =========================================================== */

//         _subscribeEvents: function () {

//             var that = this;

//             /*
//              * AppLifeCycle
//              */

//             sap.ushell.Container
//                 .getServiceAsync("AppLifeCycle")

//                 .then(function (oService) {

//                     if (
//                         oService &&
//                         oService.attachAppLoaded
//                     ) {

//                         oService.attachAppLoaded(
//                             that._onAppOpened.bind(that)
//                         );
//                     }
//                 });

//             /*
//              * Hash Listener
//              */

//             var lastURL = document.URL;

//             window.addEventListener(
//                 "hashchange",

//                 function (event) {

//                     Object.defineProperty(
//                         event,
//                         "oldURL",
//                         {
//                             enumerable: true,
//                             configurable: true,
//                             value: lastURL
//                         }
//                     );

//                     Object.defineProperty(
//                         event,
//                         "newURL",
//                         {
//                             enumerable: true,
//                             configurable: true,
//                             value: document.URL
//                         }
//                     );

//                     lastURL = document.URL;

//                     that._onHashChange(event);

//                 }.bind(this)
//             );
//         },

//         /* =========================================================== */
//         /* APP OPENED                                                  */
//         /* =========================================================== */

//         _onAppOpened: function (oEvent) {

//             var oApp =
//                 (oEvent && oEvent.oApplication) ||
//                 oEvent ||
//                 {};

//             console.log(
//                 "App Opened",
//                 oApp
//             );
//         },

//         /* =========================================================== */
//         /* HASH CHANGE                                                 */
//         /* =========================================================== */

//         _onHashChange: function (oEvent) {

//             var sOldHash =
//                 this._extractHash(oEvent.oldURL);

//             var sNewHash =
//                 this._extractHash(oEvent.newURL);

//             /*
//              * Ignore invalid
//              */

//             if (
//                 !sNewHash ||
//                 sOldHash === sNewHash
//             ) {
//                 return;
//             }

//             /*
//              * Prevent duplicates
//              */

//             if (sNewHash === this._lastHash) {
//                 return;
//             }

//             this._lastHash = sNewHash;

//             /*
//              * Parse intent
//              */

//             var oIntent =
//                 this._parseHash("#" + sNewHash);

//             if (!oIntent.semanticObject) {
//                 return;
//             }

//             /*
//              * Ignore FLP shell navigation
//              */

//             if (
//                 SKIP_SEMANTIC_OBJECTS.indexOf(
//                     oIntent.semanticObject
//                 ) !== -1
//             ) {
//                 return;
//             }

//             /*
//              * Resolve Tile
//              */

//             var aTiles =
//                 this._filterUserTiles(
//                     this.UserTiles,
//                     sNewHash
//                 );

//             if (!aTiles || aTiles.length === 0) {

//                 console.log(
//                     "No Tile Match:",
//                     sNewHash
//                 );

//                 return;
//             }

//             var oTile = aTiles[0];

//             /*
//              * Resolve real app ID
//              */

//             var sAppId =
//                 this._resolveCurrentAppId();

//             /*
//              * Payload
//              */

//             var oPayload = {

//                 AppId:
//                     sAppId || "",

//                 TileId:
//                     oTile.tileId || "",

//                 CatalogId:
//                     oTile.catalogId || "",

//                 AppTitle:
//                     oTile.appTitle || "",

//                 GroupTitle:
//                     oTile.groupTitle || "",

//                 SemanticObject:
//                     oIntent.semanticObject || "",

//                 ActionName:
//                     oIntent.action || "",

//                 IntentHash:
//                     "#" + sNewHash,

//                 EventType:
//                     "APP_LAUNCH",

//                 DeviceType:
//                     this._device(),

//                 Browser:
//                     this._browser(),

//                 SessionId:
//                     this._session()
//             };

//             console.log(
//                 "Tracking Payload",
//                 oPayload
//             );

//             this._createLog(oPayload);
//         },

//         /* =========================================================== */
//         /* ODATA CREATE                                                */
//         /* =========================================================== */

//         _createLog: function (oPayload) {

//             var oModel = this.getModel();

//             if (!oModel) {
//                 return;
//             }

//             oModel.create(
//                 ENTITY_SET,
//                 oPayload,
//                 {

//                     async: true,

//                     success: function () {

//                         console.log(
//                             "Usage Logged Successfully"
//                         );
//                     },

//                     error: function (oError) {

//                         console.error(
//                             "Usage Logging Failed",
//                             oError
//                         );
//                     }
//                 }
//             );
//         },

//         /* =========================================================== */
//         /* FILTER TILE                                                 */
//         /* =========================================================== */

//         _filterUserTiles: function (
//             arr,
//             query
//         ) {

//             return arr.filter(function (el) {

//                 return (
//                     el.targetHash &&
//                     el.targetHash
//                     .toLowerCase()
//                     .indexOf(
//                         query.toLowerCase()
//                     ) !== -1
//                 );
//             });
//         },

//         /* =========================================================== */
//         /* EXTRACT HASH                                                */
//         /* =========================================================== */

//         _extractHash: function (url) {

//             if (!url) {
//                 return "";
//             }

//             var parts = url.split("#");

//             parts = parts.filter(Boolean);

//             if (parts.length > 0) {
//                 return parts.pop();
//             }

//             return "";
//         },

//         /* =========================================================== */
//         /* PARSE HASH                                                  */
//         /* =========================================================== */

//         _parseHash: function (sRawHash) {

//             var result = {
//                 semanticObject: "",
//                 action: "",
//                 full: ""
//             };

//             if (
//                 !sRawHash ||
//                 sRawHash === "#"
//             ) {
//                 return result;
//             }

//             var s =
//                 sRawHash.replace(/^#/, "");

//             var sClean =
//                 s.split("?")[0]
//                 .split("~")[0];

//             result.full =
//                 "#" + sClean;

//             var nDash =
//                 sClean.indexOf("-");

//             if (nDash > 0) {

//                 result.semanticObject =
//                     sClean.substring(
//                         0,
//                         nDash
//                     );

//                 result.action =
//                     sClean.substring(
//                         nDash + 1
//                     );
//             }

//             return result;
//         },

//         /* =========================================================== */
//         /* RESOLVE APP ID                                              */
//         /* =========================================================== */

//         _resolveCurrentAppId: function () {

//             try {

//                 var oALC =
//                     sap.ushell.Container
//                     .getService("AppLifeCycle");

//                 var oCurrent =
//                     oALC.getCurrentApplication();

//                 if (
//                     oCurrent &&
//                     oCurrent.componentInstance
//                 ) {

//                     var oSapApp =
//                         oCurrent.componentInstance
//                         .getManifestEntry("sap.app");

//                     if (
//                         oSapApp &&
//                         oSapApp.id
//                     ) {

//                         return oSapApp.id;
//                     }
//                 }

//             } catch (e) {

//                 console.error(
//                     "App ID Resolve Failed",
//                     e
//                 );
//             }

//             return "";
//         },

//         /* =========================================================== */
//         /* DEVICE                                                      */
//         /* =========================================================== */

//         _device: function () {

//             if (Device.system.tablet) {
//                 return "Tablet";
//             }

//             if (Device.system.phone) {
//                 return "Mobile";
//             }

//             return "Desktop";
//         },

//         /* =========================================================== */
//         /* BROWSER                                                     */
//         /* =========================================================== */

//         _browser: function () {

//             return Device.browser.name || "Other";
//         },

//         /* =========================================================== */
//         /* SESSION                                                     */
//         /* =========================================================== */

//         _session: function () {

//             if (!window._zftxSid) {

//                 window._zftxSid =
//                     "S" +
//                     Date.now().toString(36) +
//                     Math.random()
//                     .toString(36)
//                     .substring(2, 6)
//                     .toUpperCase();
//             }

//             return window._zftxSid;
//         },

//         /* =========================================================== */
//         /* SAFE RENDERER                                               */
//         /* =========================================================== */

//         _getRenderer: function () {

//             var that = this;

//             var oDeferred =
//                 new jQuery.Deferred();

//             var oRenderer;

//             that._oShellContainer =
//                 jQuery.sap.getObject(
//                     "sap.ushell.Container"
//                 );

//             if (!that._oShellContainer) {

//                 oDeferred.reject(
//                     "Shell Container unavailable"
//                 );

//             } else {

//                 oRenderer =
//                     that._oShellContainer
//                     .getRenderer();

//                 if (oRenderer) {

//                     oDeferred.resolve(
//                         oRenderer
//                     );

//                 } else {

//                     that._onRendererCreated =
//                         function (oEvent) {

//                             oRenderer =
//                                 oEvent.getParameter(
//                                     "renderer"
//                                 );

//                             if (oRenderer) {

//                                 oDeferred.resolve(
//                                     oRenderer
//                                 );

//                             } else {

//                                 oDeferred.reject(
//                                     "Renderer unavailable"
//                                 );
//                             }
//                         };

//                     that._oShellContainer
//                         .attachRendererCreatedEvent(
//                             that._onRendererCreated
//                         );
//                 }
//             }

//             return oDeferred.promise();
//         }
//     });
// });