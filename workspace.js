/* global cpdefine chilipeppr cprequire */
cprequire_test(["inline:com-chilipeppr-workspace-robot"], function(ws) {

    console.log("initting workspace");

    /**
     * The Root workspace (when you see the ChiliPeppr Header) auto Loads the Flash 
     * Widget so we can show the 3 second flash messages. However, in test mode we
     * like to see them as well, so just load it from the cprequire_test() method
     * so we have similar functionality when testing this workspace.
     */
    var loadFlashMsg = function() {
        chilipeppr.load("#com-chilipeppr-widget-flash-instance",
            "http://raw.githubusercontent.com/chilipeppr/element-flash/master/auto-generated-widget.html",
            function() {
                console.log("mycallback got called after loading flash msg module");
                cprequire(["inline:com-chilipeppr-elem-flashmsg"], function(fm) {
                    //console.log("inside require of " + fm.id);
                    fm.init();
                });
            }
        );
    };
    loadFlashMsg();

    // Init workspace
    ws.init();

    // Do some niceties for testing like margins on widget and title for browser
    $('title').html("Robot Workspace");
    $('body').css('padding', '10px');

} /*end_test*/ );

// This is the main definition of your widget. Give it a unique name.
cpdefine("inline:com-chilipeppr-workspace-robot", ["chilipeppr_ready"], function() {
    return {
        /**
         * The ID of the widget. You must define this and make it unique.
         */
        id: "com-chilipeppr-workspace-robot", // Make the id the same as the cpdefine id
        name: "Workspace / Robot", // The descriptive name of your widget.
        desc: `This workspace is for controlling a 6 DOF robot arm.`,
        url: "(auto fill by runme.js)", // The final URL of the working widget as a single HTML file with CSS and Javascript inlined. You can let runme.js auto fill this if you are using Cloud9.
        fiddleurl: "(auto fill by runme.js)", // The edit URL. This can be auto-filled by runme.js in Cloud9 if you'd like, or just define it on your own to help people know where they can edit/fork your widget
        githuburl: "(auto fill by runme.js)", // The backing github repo
        testurl: "(auto fill by runme.js)", // The standalone working widget so can view it working by itself

        foreignSubscribe: {
            "/com-chilipeppr-elem-dragdrop/ondragover": "The Chilipeppr drag drop element will publish on channel /com-chilipeppr-elem-dragdrop/ondropped when a file is dropped so we subscribe to it so we can load a Gcode file when the user drags it onto the browser. It also adds a hover class to the bound DOM elem so we can add a CSS to hilite on hover",
            "/com-chilipeppr-elem-dragdrop/ondragleave": "We need to know when the drag is over to remove the CSS hilites.",
            "/com-chilipeppr-widget-gcode/resize": "We watch if the Gcode viewer resizes so that we can reposition or resize other elements in the workspace. Specifically we ask the Serial Port Console to resize. We also redraw the 3D Viewer so it fills the whole screen."
        },

        foreignPublish: {},

        /**
         * Contains reference to the Console widget object. Hang onto the reference
         * so we can resize it when the window resizes because we want it to manually
         * resize to fill the height of the browser so it looks clean.
         */
        widgetConsole: null,
        /**
         * Contains reference to the Serial Port JSON Server object.
         */
        widgetSpjs: null,
        /**
         * The workspace's init method. It loads the all the widgets contained in the workspace
         * and inits them.
         */
        init: function() {

            // Most workspaces will instantiate the Serial Port JSON Server widget
            this.loadSpjsWidget();
            
            // Most workspaces will instantiate the Serial Port Console widget
            this.loadConsoleWidget();
            
            // This is a huge method that was built from the original jsfiddle workspace
            // we should technically put each widget in its own method for loading
            this.loadWidgets();

            // Create our workspace upper right corner triangle menu
            this.loadWorkspaceMenu();
            
            // Add our billboard to the menu (has name, url, picture of workspace)
            this.addBillboardToWorkspaceMenu();

            // Setup an event to react to window resize. This helps since
            // some of our widgets have a manual resize to cleanly fill
            // the height of the browser window. You could turn this off and
            // just set widget min-height in CSS instead
            this.setupResize();
            
            setTimeout(function() {
                $(window).trigger('resize');
                $('title').html("Robot Workspace");
            }, 3000);


        },
        /**
         * Returns the billboard HTML, CSS, and Javascript for this Workspace. The billboard
         * is used by the home page, the workspace picker, and the fork pulldown to show a
         * consistent name/image/description tag for the workspace throughout the ChiliPeppr ecosystem.
         */
        getBillboard: function() {
            var el = $('#' + this.id + '-billboard').clone();
            el.removeClass("hidden");
            el.find('.billboard-desc').text(this.desc);
            return el;
        },
        /**
         * Inject the billboard into the Workspace upper right corner pulldown which
         * follows the standard template for workspace pulldown menus.
         */
        addBillboardToWorkspaceMenu: function() {
            // get copy of billboard
            var billboardEl = this.getBillboard();
            $('#' + this.id + ' .com-chilipeppr-ws-billboard').append(billboardEl);
        },
        /**
         * Listen to window resize event.
         */
        setupResize: function() {
            $(window).on('resize', this.onResize.bind(this));
        },
        /**
         * When browser window resizes, forcibly resize the Console window
         */
        onResize: function() {
            if (this.widgetConsole) this.widgetConsole.resize();
        },
        /**
         * Load the Serial Port JSON Server widget via chilipeppr.load()
         */
        loadSpjsWidget: function(callback) {

            var that = this;

            chilipeppr.load(
                "#com-chilipeppr-widget-spjs-instance",
                "http://raw.githubusercontent.com/chilipeppr/widget-spjs/master/auto-generated-widget.html",
                function() {
                    console.log("mycallback got called after loading spjs module");
                    cprequire(["inline:com-chilipeppr-widget-serialport"], function(spjs) {
                        //console.log("inside require of " + fm.id);
                        spjs.setSingleSelectMode();
                        spjs.init({
                            isSingleSelectMode: true,
                            defaultBuffer: "robot",
                            defaultBaud: 115200,
                            bufferEncouragementMsg: 'For your device please choose the "robot" or "robotg2" buffer in the pulldown and a 115200 baud rate before connecting.'
                        });
                        //spjs.showBody();
                        //spjs.consoleToggle();

                        that.widgetSpjs - spjs;

                        if (callback) callback(spjs);

                    });
                }
            );
        },
        /**
         * Load the Console widget via chilipeppr.load()
         */
        loadConsoleWidget: function(callback) {
            var that = this;
            chilipeppr.load(
                "#com-chilipeppr-widget-console-instance",
                "http://raw.githubusercontent.com/chilipeppr/widget-console/master/auto-generated-widget.html",
                function() {
                    // Callback after widget loaded into #com-chilipeppr-widget-spconsole-instance
                    cprequire(
                        ["inline:com-chilipeppr-widget-spconsole"], // the id you gave your widget
                        function(mywidget) {
                            // Callback that is passed reference to your newly loaded widget
                            console.log("My Console widget just got loaded.", mywidget);
                            that.widgetConsole = mywidget;

                            // init the serial port console
                            // 1st param tells the console to use "single port mode" which
                            // means it will only show data for the green selected serial port
                            // rather than for multiple serial ports
                            // 2nd param is a regexp filter where the console will filter out
                            // annoying messages you don't generally want to see back from your
                            // device, but that the user can toggle on/off with the funnel icon
                            that.widgetConsole.init(true, /^{/);
                            if (callback) callback(mywidget);
                        }
                    );
                }
            );
        },
        /**
         * Load the workspace menu and show the pubsubviewer and fork links using
         * our pubsubviewer widget that makes those links for us.
         */
        loadWorkspaceMenu: function(callback) {
            // Workspace Menu with Workspace Billboard
            var that = this;
            chilipeppr.load(
                "http://raw.githubusercontent.com/chilipeppr/widget-pubsubviewer/master/auto-generated-widget.html",
                function() {
                    require(['inline:com-chilipeppr-elem-pubsubviewer'], function(pubsubviewer) {

                        var el = $('#' + that.id + ' #com-chilipeppr-ws-menu .dropdown-menu-ws');
                        console.log("got callback for attachto menu for workspace. attaching to el:", el);

                        pubsubviewer.attachTo(
                            el,
                            that,
                            "Workspace"
                        );

                        if (callback) callback();
                    });
                }
            );
        },


        loadWidgets: function(callback) {
            
            // create a workspace object reference to this so inside the anonymous functions below
            // the workspace can be referred to
            var wsObj = this;
            
            // Load XBox Controller Widget
            chilipeppr.load(
              "#com-chilipeppr-ws-xbox",
              "http://raw.githubusercontent.com/chilipeppr/widget-xbox/master/auto-generated-widget.html",
              function() {
                // Callback after widget loaded into #myDivWidgetXbox
                // Now use require.js to get reference to instantiated widget
                cprequire(
                  ["inline:com-chilipeppr-widget-xbox"], // the id you gave your widget
                  function(myObjWidgetXbox) {
                    // Callback that is passed reference to the newly loaded widget
                    console.log("Widget / Xbox just got loaded.", myObjWidgetXbox);
                    myObjWidgetXbox.init();
                    
                    // setup toggle button
                    var zwBtn = $('#com-chilipeppr-ws-menu .xbox-button');
                    var zwDiv = $('#com-chilipeppr-ws-xbox');
                    zwBtn.click(function() {
                        if (zwDiv.hasClass("hidden")) {
                            // unhide
                            zwDiv.removeClass("hidden");
                            zwBtn.addClass("active");
                        }
                        else {
                            zwDiv.addClass("hidden");
                            zwBtn.removeClass("active");
                        }
                        $(window).trigger('resize');
                    });
                  }
                );
              }
            );

            

            // Zipwhip texting
            // com-chilipeppr-ws-zipwhip
            /*
            chilipeppr.load(
                "#com-chilipeppr-ws-zipwhip",
                "http://raw.githubusercontent.com/chilipeppr/widget-zipwhip/master/auto-generated-widget.html",
                function() {
                    require(["inline:com-chilipeppr-elem-zipwhip"], function(zipwhip) {
                        zipwhip.init();
                        // setup toggle button
                        var zwBtn = $('#com-chilipeppr-ws-menu .zipwhip-button');
                        var zwDiv = $('#com-chilipeppr-ws-zipwhip');
                        zwBtn.click(function() {
                            if (zwDiv.hasClass("hidden")) {
                                // unhide
                                zwDiv.removeClass("hidden");
                                zwBtn.addClass("active");
                            }
                            else {
                                zwDiv.addClass("hidden");
                                zwBtn.removeClass("active");
                            }
                            $(window).trigger('resize');
                        });
                    });
                }); //End Zipwhip texting
            */

            // Zipwhip Recieve Text widget
            // Dynamically load the Zipwhip Recieve Text widget, i.e. wait til user clicks on the button
            // first time.
            /*
            wsObj.zipwhipRecvTextObj = {
                zipwhipRecvTextBtn: null,
                zipwhipRecvTextDiv: null,
                zipwhipRecvTextInstance: null,
                init: function() {
                    this.zipwhipRecvTextBtn = $('#com-chilipeppr-ws-menu .zipwhip-recvtext-button');
                    this.zipwhipRecvTextDiv = $('#com-chilipeppr-ws-zipwhip-recvtext');
                    this.setupBtn();
                    console.log("done instantiating zipwhipRecvText add-on widget");
                },
                setupBtn: function() {
                    this.zipwhipRecvTextBtn.click(this.togglezipwhipRecvText.bind(this));
                },
                togglezipwhipRecvText: function() {
                    if (this.zipwhipRecvTextDiv.hasClass("hidden")) {
                        // unhide
                        this.showzipwhipRecvText();
                    }
                    else {
                        this.hidezipwhipRecvText();
                    }
                },
                showzipwhipRecvText: function(callback) {
                    this.zipwhipRecvTextDiv.removeClass("hidden");
                    this.zipwhipRecvTextBtn.addClass("active");

                    console.log("got showzipwhipRecvText. this:", this, "wsObj:", wsObj);
                    
                    // see if instantiated already
                    // if so, just activate
                    if (this.zipwhipRecvTextInstance != null) {
                        console.log("activating zipwhip recv text instead of re-instantiating cuz already created")
                        this.zipwhipRecvTextInstance.activateWidget();
                        if (callback) callback(this.zipwhipRecvTextInstance);
                    }
                    else {
                        // otherwise, dynamic load
                        console.log("zipwhip recv text appears to not be instantiated, let us load it from scratch")
                        var that = this;
                        chilipeppr.load(
                          this.zipwhipRecvTextDiv.prop("id"),
                          "http://raw.githubusercontent.com/chilipeppr/widget-recvtext/master/auto-generated-widget.html",
                          function() {
                            // Callback after widget loaded into #myDivWidgetRecvtext
                            // Now use require.js to get reference to instantiated widget
                            cprequire(
                              ["inline:com-chilipeppr-widget-recvtext"], // the id you gave your widget
                              function(myObjWidgetRecvtext) {
                                // Callback that is passed reference to the newly loaded widget
                                console.log("Widget / Zipwhip Receive Text just got loaded.", myObjWidgetRecvtext);
                                myObjWidgetRecvtext.init();
                                that.zipwhipRecvTextInstance = myObjWidgetRecvtext;
                                if (callback) callback(that.zipwhipRecvTextInstance);
                              }
                            );
                          }
                        );
                    }
                    $(window).trigger('resize');
                },
                hidezipwhipRecvText: function() {
                    this.zipwhipRecvTextDiv.addClass("hidden");
                    this.zipwhipRecvTextBtn.removeClass("active");
                    
                    console.log("got hidezipwhipRecvText. this:", this, "wsObj:", wsObj);
                    
                    if (this.zipwhipRecvTextInstance != null) {
                        this.zipwhipRecvTextInstance.unactivateWidget();
                    }
                    $(window).trigger('resize');
                },
            };
            wsObj.zipwhipRecvTextObj.init();
            */
            //End Zipwhip Receive Text
            
           


            // Macro
            // com-chilipeppr-ws-macro
            chilipeppr.load(
                "#com-chilipeppr-ws-macro",
                "http://raw.githubusercontent.com/chilipeppr/widget-macro/master/auto-generated-widget.html",
                function() {
                    //"http://fiddle.jshell.net/chilipeppr/ZJ5vV/show/light/", function () {
                    cprequire(["inline:com-chilipeppr-widget-macro"], function(macro) {
                        macro.init();
                        // setup toggle button
                        var alBtn = $('#com-chilipeppr-ws-menu .macro-button');
                        var alDiv = $('#com-chilipeppr-ws-macro');
                        alBtn.click(function() {
                            if (alDiv.hasClass("hidden")) {
                                // unhide
                                alDiv.removeClass("hidden");
                                alBtn.addClass("active");
                                //autolevel.onDisplay();
                            }
                            else {
                                alDiv.addClass("hidden");
                                alBtn.removeClass("active");
                                //autolevel.onUndisplay();
                            }
                            $(window).trigger('resize');

                        });
                    });
                }); //End Macro

            
            
            
    
            // Element / Drag Drop
            // Load the dragdrop element into workspace toolbar
            // http://jsfiddle.net/chilipeppr/Z9F6G/
            chilipeppr.load("#com-chilipeppr-ws-gcode-dragdrop",
                "http://raw.githubusercontent.com/chilipeppr/elem-dragdrop/master/auto-generated-widget.html",
                function() {
                    require(["inline:com-chilipeppr-elem-dragdrop"], function(dd) {
                        console.log("inside require of dragdrop");
                        $('.com-chilipeppr-elem-dragdrop').removeClass('well');
                        dd.init();
                        // The Chilipeppr drag drop element will publish
                        // on channel /com-chilipeppr-elem-dragdrop/ondropped
                        // when a file is dropped so subscribe to it
                        // It also adds a hover class to the bound DOM elem
                        // so you can add CSS to hilite on hover
                        dd.bind("#com-chilipeppr-ws-gcode-wrapper", null);
                        //$(".com-chilipeppr-elem-dragdrop").popover('show');
                        //dd.bind("#pnlWorkspace", null);
                        var ddoverlay = $('#com-chilipeppr-ws-gcode-dragdropoverlay');
                        chilipeppr.subscribe("/com-chilipeppr-elem-dragdrop/ondragover", function() {
                            //console.log("got dragdrop hover");
                            ddoverlay.removeClass("hidden");
                        });
                        chilipeppr.subscribe("/com-chilipeppr-elem-dragdrop/ondragleave", function() {
                            ddoverlay.addClass("hidden");
                            //console.log("got dragdrop leave");
                        });
                        console.log(dd);
                    });
                }
            ); //End Element / Drag Drop
            
            // 3D Viewer
            // http://jsfiddle.net/chilipeppr/y3HRF
            chilipeppr.load(
                "#com-chilipeppr-3dviewer",
                "http://raw.githubusercontent.com/chilipeppr/widget-3dview-robot/master/auto-generated-widget.html",
    
                function() {
                    console.log("got callback done loading 3d");
    
                    cprequire(
                        ['inline:com-chilipeppr-widget-3dview-robot'],
    
                        function(threed) {
                            console.log("Running 3dviewer");
                            threed.init();
                            console.log("3d viewer initted");
    
                            // Ok, do someting whacky. Try to move the 3D Viewer 
                            // Control Panel to the center column
                            setTimeout(function() {
                                var element = $('#com-chilipeppr-3dviewer .panel-heading').detach();
                                $('#com-chilipeppr-3dviewer').addClass("noheight");
                                $('#com-chilipeppr-widget-3dviewer').addClass("nomargin");
                                $('#com-chilipeppr-3dviewer-controlpanel').append(element);
                            }, 10);
    
                            // listen to resize events so we can resize our 3d viewer
                            // this was done to solve the scrollbar residue we were seeing
                            // resize this console on a browser resize
                            var mytimeout = null;
                            $(window).on('resize', function(evt) {
                                //console.log("3d view force resize");
                                if (mytimeout !== undefined && mytimeout != null) {
                                    clearTimeout(mytimeout);
                                    //console.log("cancelling timeout resize");
                                }
                                mytimeout = setTimeout(function() {
                                    console.log("3d view force resize. 1 sec later");
                                    threed.resize();
                                }, 1000);
    
                            });
                        }
                    );
                }
            ); //End 3D Viewer

            // Gcode List v3
            // OLD v2 http://jsfiddle.net/chilipeppr/F2Qn3/
            // NEW v3 with onQueue/onWrite/onComplete http://jsfiddle.net/chilipeppr/a4g5ds5n/
            chilipeppr.load("#com-chilipeppr-gcode-list",
                "http://raw.githubusercontent.com/chilipeppr/widget-gcodelist/master/auto-generated-widget.html",

                function() {
                    cprequire(
                        ["inline:com-chilipeppr-widget-gcode"],

                        function(gcodelist) {
                            gcodelist.init({
                                lineNumbersOnByDefault: true
                            });
                        }
                    );
                }
            ); //End Gcode List v3

            


            // XYZ
            // http://jsfiddle.net/chilipeppr/gh45j/
            chilipeppr.load(
                "com-chilipeppr-xyz",
                // Lauer's new widget 8/16/15
                "http://raw.githubusercontent.com/chilipeppr/widget-axes/master/auto-generated-widget.html", 
                // Temporary widget from Danal
                //"http://fiddle.jshell.net/Danal/vktco1y6/show/light/", 
                // Lauer's original core widget
                //"http://fiddle.jshell.net/chilipeppr/gh45j/show/light/",
        
                function () {
                    cprequire(
                    ["inline:com-chilipeppr-widget-xyz"],
            
                    function (xyz) {
                        xyz.init();
                    });
                }
            ); //End XYZ
            
            

            // Cayenn Widget
            /*
            chilipeppr.load(
              "#com-chilipeppr-ws-cayenn",
              "http://raw.githubusercontent.com/chilipeppr/widget-cayenn/master/auto-generated-widget.html",
              function() {
                // Callback after widget loaded into #myDivWidgetCayenn
                // Now use require.js to get reference to instantiated widget
                cprequire(
                  ["inline:com-chilipeppr-widget-cayenn"], // the id you gave your widget
                  function(myObjWidgetCayenn) {
                    // Callback that is passed reference to the newly loaded widget
                    console.log("Widget / Cayenn just got loaded.", myObjWidgetCayenn);
                    myObjWidgetCayenn.init();
                    
                    // this widget has a lot of modals that pop up whenever, so we need to make sure the parent div is
                    // not hidden. instead we'll hide the exact widget because the modals are outside the div of the widget
                    $('#com-chilipeppr-ws-cayenn').removeClass("hidden");
                    
                    var btn = $('#com-chilipeppr-ws-menu .cayenn-button');
                    var div = $('#com-chilipeppr-widget-cayenn');
                    div.addClass("hidden");
                    btn.click(function() {
                        if (div.hasClass("hidden")) {
                            // show widget
                            div.removeClass("hidden");
                            btn.addClass("active");
                        } else {
                            // hide widget
                            div.addClass("hidden");
                            btn.removeClass("active");
                        }
                        setTimeout(function() {
                            $(window).trigger('resize');
                        }, 200);
                    });
                    
                  }
                );
              }
            );
            */
            

        },
        //end loadWidgets

    }
});