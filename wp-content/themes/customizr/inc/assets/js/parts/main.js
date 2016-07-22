//@global TCParams
var czrapp = czrapp || {};

(function($, czrapp) {
  //short name for the slice method from the built-in Array js prototype
  //used to handle the event methods
  var slice = Array.prototype.slice;

  $.extend( czrapp, {
    instances        : {},//will store all subclasses instances
    methods          : {},//will store all subclasses methods

    //parent class constructor
    Base : function() {},

    _inherits : function( classname ) {
      //add the class to the czrapp and sets the parent this to it
      czrapp[classname] = function() {
        czrapp.Base.call(this);
      };

      //set the classical prototype chaining with inheritance
      czrapp[classname].prototype = Object.create( czrapp.Base.prototype );
      czrapp[classname].prototype.constructor = czrapp[classname];
      return czrapp;
    },


    _instanciates : function( classname) {
      czrapp.instances[classname] = czrapp.instances[classname] || new czrapp[classname]();
      return czrapp;
    },


    /**
     * [_init description]
     * @param  {[type]} classname string
     * @param  {[type]} methods   array of methods
     * @return {[type]} czrapp object
     */
    _init : function(classname, methods) {
      var _instance = czrapp.instances[classname] || false;
      if ( ! _instance )
        return;

      //always fire the init method if exists
      if ( _instance.init )
        _instance.init();

      //fire the array of methods on load
      _instance.emit(methods);

      //return czrapp for chaining
      return czrapp;
    },

    //extend a classname prototype with a set of methods
    _addMethods : function(classname) {
      $.extend( czrapp[classname].prototype , czrapp._getMethods(classname) );
      return czrapp;
    },

    _getMethods : function(classname) {
      return czrapp.methods[classname] || {};
    },


    /**
    * Cache properties on Dom Ready
    * @return {[type]} [description]
    */
    cacheProp : function() {
      $.extend( czrapp, {
        //cache various jQuery el in czrapp obj
        $_window         : $(window),
        $_html           : $('html'),
        $_body           : $('body'),
        $_tcHeader       : $('.tc-header'),
        $_wpadminbar     : $('#wpadminbar'),

        //various properties definition
        localized        : TCParams || {},
        is_responsive    : this.isResponsive(),//store the initial responsive state of the window
        current_device   : this.getDevice()//store the initial device
      });
      return czrapp;
    },


    /***************************************************************************
    * CUSTOM EVENTS
    * tc-resize
    ****************************************************************************/
    emitCustomEvents : function() {
      var that = this;
      /*-----------------------------------------------------
      -> CUSTOM RESIZE EVENT
      ------------------------------------------------------*/
      czrapp.$_window.resize( function(e) {
        var $_windowWidth     = czrapp.$_window.width(),
            _current          = czrapp.current_device,//<= stored on last resize event or on load
            //15 pixels adjustement to avoid replacement before real responsive width
            _to               = that.getDevice();

        //updates width dependant properties
        czrapp.is_responsive  = that.isResponsive();
        czrapp.current_device = _to;
        czrapp.$_body.trigger( 'tc-resize', { current : _current, to : _to} );
      } );//resize();

      return czrapp;
    },


    //bool
    isResponsive : function() {
      return $(window).width() <= 979 - 15;
    },

    //@return string of current device
    getDevice : function() {
      var _devices = {
            desktop : 979 - 15,
            tablet : 767 - 15,
            smartphone : 480 - 15
          },
          _current_device = 'desktop',
          $_window = czrapp.$_window || $(window);

      _.map( _devices, function( max_width, _dev ){
        if ( $_window.width() <= max_width )
          _current_device = _dev;
      } );
      return _current_device;
    },


    //@return bool
    isSelectorAllowed : function( $_el, skip_selectors, requested_sel_type ) {
      var sel_type = 'ids' == requested_sel_type ? 'id' : 'class',
      _selsToSkip   = skip_selectors[requested_sel_type];

      //check if option is well formed
      if ( 'object' != typeof(skip_selectors) || ! skip_selectors[requested_sel_type] || ! $.isArray( skip_selectors[requested_sel_type] ) || 0 === skip_selectors[requested_sel_type].length )
        return true;

      //has a forbidden parent?
      if ( $_el.parents( _selsToSkip.map( function( _sel ){ return 'id' == sel_type ? '#' + _sel : '.' + _sel; } ).join(',') ).length > 0 )
        return false;

      //has requested sel ?
      if ( ! $_el.attr( sel_type ) )
        return true;

      var _elSels       = $_el.attr( sel_type ).split(' '),
          _filtered     = _elSels.filter( function(classe) { return -1 != $.inArray( classe , _selsToSkip ) ;});

      //check if the filtered selectors array with the non authorized selectors is empty or not
      //if empty => all selectors are allowed
      //if not, at least one is not allowed
      return 0 === _filtered.length;
    },

    /***************************************************************************
    * Event methods, offering the ability to bind to and trigger events.
    * Inspired from the customize-base.js event manager object
    * @uses slice method, alias of Array.prototype.slice
    ****************************************************************************/
    trigger: function( id ) {
      if ( this.topics && this.topics[ id ] )
        this.topics[ id ].fireWith( this, slice.call( arguments, 1 ) );
      return this;
    },

    bind: function( id ) {
      this.topics = this.topics || {};
      this.topics[ id ] = this.topics[ id ] || $.Callbacks();
      this.topics[ id ].add.apply( this.topics[ id ], slice.call( arguments, 1 ) );
      return this;
    },

    unbind: function( id ) {
      if ( this.topics && this.topics[ id ] )
        this.topics[ id ].remove.apply( this.topics[ id ], slice.call( arguments, 1 ) );
      return this;
    },


    /**
     * Load the various { constructor [methods] }
     *
     * Constructors and methods can be disabled by passing a localized var TCParams._disabled (with the hook 'tc_disabled_front_js_parts' )
     * Ex : add_filter('tc_disabled_front_js_parts', function() {
     *   return array('Czr_Plugins' => array() , 'Czr_Slider' => array('addSwipeSupport') );
     * });
     * => will disabled all Czr_Plugin class (with all its methods) + will disabled the addSwipeSupport method from the Czr_Slider class
     * @todo : check the classes dependencies and may be add a check if ( ! method_exits() )
     *
     * @param  {[type]} args [description]
     * @return {[type]}      [description]
     */
    loadCzr : function( args ) {
      var that = this,
          _disabled = that.localized._disabled || {};

      _.each( args, function( methods, key ) {
        //normalize methods into an array if string
        methods = 'string' == typeof(methods) ? [methods] : methods;

        //key is the constructor
        //check if the constructor has been disabled => empty array of methods
        if ( that.localized._disabled[key] && _.isEmpty(that.localized._disabled[key]) )
          return;

        if ( that.localized._disabled[key] && ! _.isEmpty(that.localized._disabled[key]) ) {
          var _to_remove = that.localized._disabled[key];
          _to_remove = 'string' == typeof(_to_remove) ? [_to_remove] : _to_remove;
          methods = _.difference( methods, _to_remove );
        }
        //chain various treatments
        czrapp._inherits(key)._instanciates(key)._addMethods(key)._init(key, methods);
      });//_.each()

      czrapp.trigger('czrapp-ready', this);
    }//loadCzr

  });//extend
})(jQuery, czrapp);



/*************************
* ADD BASE CLASS METHODS
*************************/
(function($, czrapp) {
  var _methods = {
    emit : function( cbs, args ) {
      cbs = _.isArray(cbs) ? cbs : [cbs];
      var self = this;
      _.map( cbs, function(cb) {
        if ( 'function' == typeof(self[cb]) ) {
          args = 'undefined' == typeof( args ) ? Array() : args ;  
          self[cb].apply(self, args );
          czrapp.trigger( cb, _.object( _.keys(args), args ) );
        }
      });//_.map
    },

    triggerSimpleLoad : function( $_imgs ) {
      if ( 0 === $_imgs.length )
        return;

      $_imgs.map( function( _ind, _img ) {
        $(_img).load( function () {
          $(_img).trigger('simple_load');
        });//end load
        if ( $(_img)[0] && $(_img)[0].complete )
          $(_img).load();
      } );//end map
    },//end of fn

    isUserLogged     : function() {
      return czrapp.$_body.hasClass('logged-in') || 0 !== czrapp.$_wpadminbar.length;
    },

    isCustomizing    : function() {
      return czrapp.$_body.hasClass('is-customizing');
    },
    getDevice : function() {
      return czrapp.getDevice();
    },
    isReponsive : function() {
      return czrapp.isReponsive();
    },
    isSelectorAllowed: function( $_el, skip_selectors, requested_sel_type ) {
      return czrapp.isSelectorAllowed( $_el, skip_selectors, requested_sel_type );    
    }

  };//_methods{}

  $.extend( czrapp.Base.prototype, _methods );//$.extend

})(jQuery, czrapp);
/***************************
* ADD BROWSER DETECT METHODS
****************************/
(function($, czrapp) {
  var _methods =  {
    init : function() {
      // Chrome is Webkit, but Webkit is also Safari. If browser = ie + strips out the .0 suffix
      if ( $.browser.chrome )
          czrapp.$_body.addClass("chrome");
      else if ( $.browser.webkit )
          czrapp.$_body.addClass("safari");
      else if ( $.browser.msie || '8.0' === $.browser.version || '9.0' === $.browser.version || '10.0' === $.browser.version || '11.0' === $.browser.version )
          czrapp.$_body.addClass("ie").addClass("ie" + $.browser.version.replace(/[.0]/g, ''));

      //Adds version if browser = ie
      if ( czrapp.$_body.hasClass("ie") )
          czrapp.$_body.addClass($.browser.version);
    }
  };//_methods{}

  $.extend( czrapp.methods.BrowserDetect = {} , _methods );

})(jQuery, czrapp);var czrapp = czrapp || {};
/***************************
* ADD JQUERY PLUGINS METHODS
****************************/
(function($, czrapp) {
  var _methods = {
    centerImagesWithDelay : function( delay ) {
      var self = this;
      //fire the center images plugin
      setTimeout( function(){ self.emit('centerImages'); }, delay || 300 );
    },


    //IMG SMART LOAD
    //.article-container covers all post / page content : single and list
    //__before_main_wrapper covers the single post thumbnail case
    //.widget-front handles the featured pages
    imgSmartLoad : function() {
      var smartLoadEnabled = 1 == TCParams.imgSmartLoadEnabled,
          //Default selectors for where are : $( '.article-container, .__before_main_wrapper, .widget-front' ).find('img');
          _where           = TCParams.imgSmartLoadOpts.parentSelectors.join(),
          $_to_center      = $( _where ).find('img');

      if ( smartLoadEnabled ) {
        $_to_center      = _.filter( $( _where ).find('img') , function ( img ) {
          return $(img).is(TCParams.imgSmartLoadOpts.opts.excludeImg.join());
        } );//filter
      }//if

      if (  smartLoadEnabled )
        $( _where ).imgSmartLoad(
          _.size( TCParams.imgSmartLoadOpts.opts ) > 0 ? TCParams.imgSmartLoadOpts.opts : {}
        );

      this.triggerSimpleLoad($_to_center);
    },


    //FIRE DROP CAP PLUGIN
    dropCaps : function() {
      if ( ! TCParams.dropcapEnabled || ! _.isObject( TCParams.dropcapWhere ) )
        return;

      $.each( TCParams.dropcapWhere , function( ind, val ) {
        if ( 1 == val ) {
          $( '.entry-content' , 'body.' + ( 'page' == ind ? 'page' : 'single-post' ) ).children().first().addDropCap( {
            minwords : TCParams.dropcapMinWords,//@todo check if number
            skipSelectors : _.isObject(TCParams.dropcapSkipSelectors) ? TCParams.dropcapSkipSelectors : {}
          });
        }
      });//each
    },


    //FIRE EXT LINKS PLUGIN
    //May be add (check if activated by user) external class + target="_blank" to relevant links
    //images are excluded by default
    //links inside post/page content
    extLinks : function() {
      if ( ! TCParams.extLinksStyle && ! TCParams.extLinksTargetExt )
        return;
      $('a' , '.entry-content').extLinks({
        addIcon : TCParams.extLinksStyle,
        newTab : TCParams.extLinksTargetExt,
        skipSelectors : _.isObject(TCParams.extLinksSkipSelectors) ? TCParams.extLinksSkipSelectors : {}
      });
    },

    //FIRE FANCYBOX PLUGIN
    //Fancybox with localized script variables
    fancyBox : function() {
      if ( 1 != TCParams.FancyBoxState || 'function' != typeof($.fn.fancybox) )
        return;

      $("a.grouped_elements").fancybox({
        transitionOut: "elastic",
        transitionIn: "elastic",
        speedIn: 200,
        speedOut: 200,
        overlayShow: !1,
        autoScale: 1 == TCParams.FancyBoxAutoscale ? "true" : "false",
        changeFade: "fast",
        enableEscapeButton: !0
      });

      //replace title by img alt field
      $('a[rel*=tc-fancybox-group]').each( function() {
        var title = $(this).find('img').prop('title');
        var alt = $(this).find('img').prop('alt');
        if (typeof title !== 'undefined' && 0 !== title.length)
          $(this).attr('title',title);
        else if (typeof alt !== 'undefined' &&  0 !== alt.length)
          $(this).attr('title',alt);
      });
    },


    /**
    * CENTER VARIOUS IMAGES
    * @return {void}
    */
    centerImages : function() {
      //SLIDER IMG + VARIOUS
      setTimeout( function() {
        $( '.carousel .carousel-inner').centerImages( {
          enableCentering : 1 == TCParams.centerSliderImg,
          imgSel : '.item .carousel-image img',
          oncustom : ['slid', 'simple_load'],
          defaultCSSVal : { width : '100%' , height : 'auto' },
          useImgAttr : true
        });
        $('.tc-slider-loader-wrapper').hide();
      } , 50);

      //Featured Pages
      $('.widget-front .thumb-wrapper').centerImages( {
        enableCentering : 1 == TCParams.centerAllImg,
        enableGoldenRatio : false,
        disableGRUnder : 0,//<= don't disable golden ratio when responsive
        zeroTopAdjust : 1,
        leftAdjust : 2.5,
        oncustom : ['smartload', 'simple_load']
      });
      //POST LIST THUMBNAILS + FEATURED PAGES
      //Squared, rounded
      $('.thumb-wrapper', '.hentry' ).centerImages( {
        enableCentering : 1 == TCParams.centerAllImg,
        enableGoldenRatio : false,
        disableGRUnder : 0,//<= don't disable golden ratio when responsive
        oncustom : ['smartload', 'simple_load']
      });

      //rectangulars
      $('.tc-rectangular-thumb').centerImages( {
        enableCentering : 1 == TCParams.centerAllImg,
        enableGoldenRatio : true,
        goldenRatioVal : TCParams.goldenRatio || 1.618,
        disableGRUnder : 0,//<= don't disable golden ratio when responsive
        oncustom : ['smartload', 'refresh-height', 'simple_load'] //bind 'refresh-height' event (triggered to the the customizer preview frame)
      });

      //SINGLE POST THUMBNAILS
      $('.tc-rectangular-thumb' , '.single').centerImages( {
        enableCentering : 1 == TCParams.centerAllImg,
        enableGoldenRatio : false,
        disableGRUnder : 0,//<= don't disable golden ratio when responsive
        oncustom : ['smartload', 'refresh-height', 'simple_load'] //bind 'refresh-height' event (triggered to the the customizer preview frame)
      });

      //POST GRID IMAGES
      $('.tc-grid-figure').centerImages( {
        enableCentering : 1 == TCParams.centerAllImg,
        oncustom : ['smartload', 'simple_load'],
        enableGoldenRatio : true,
        goldenRatioVal : TCParams.goldenRatio || 1.618,
        goldenRatioLimitHeightTo : TCParams.gridGoldenRatioLimit || 350
      } );
    },//center_images

  };//_methods{}

  $.extend( czrapp.methods.Czr_Plugins = {} , _methods );

})(jQuery, czrapp);
var czrapp = czrapp || {};

/************************************************
* ADD SLIDER METHODS
*************************************************/
(function($, czrapp) {
  var _methods = {

    //INIT
    init : function() {
      var self = this;

      // cache jQuery el
      this.$_sliders = $( 'div[id*="customizr-slider"]' );

      //@todo EVENT
      //Recenter the slider arrows on resize
      czrapp.$_window.resize( function(){
        self.centerSliderArrows();
      });
    },



    fireSliders : function(name, delay, hover) {
      //Slider with localized script variables
      var _name   = name || TCParams.SliderName,
          _delay  = delay || TCParams.SliderDelay;
          _hover  = hover || TCParams.SliderHover;

      if ( 0 === _name.length )
        return;

      if ( 0 !== _delay.length && ! _hover ) {
        this.$_sliders.carousel({
            interval: _delay,
            pause: "false"
        });
      } else if ( 0 !== _delay.length ) {
        this.$_sliders.carousel({
            interval: _delay
        });
      } else {
        this.$_sliders.carousel();
      }
    },

    manageHoverClass : function() {
      //add a class to the slider on hover => used to display the navigation arrow
      this.$_sliders.hover( function() {
          $(this).addClass('tc-slid-hover');
        },
        function() {
          $(this).removeClass('tc-slid-hover');
        }
      );
    },

    //SLIDER ARROWS
    centerSliderArrows : function() {
      if ( 0 === this.$_sliders.length )
          return;
      this.$_sliders.each( function() {
          var _slider_height = $( '.carousel-inner' , $(this) ).height();
          $('.tc-slider-controls', $(this) ).css("line-height", _slider_height +'px').css("max-height", _slider_height +'px');
      });
    },


    //Slider swipe support with hammer.js
    addSwipeSupport : function() {
      if ( 'function' != typeof($.fn.hammer) || 0 === this.$_sliders.length )
        return;

      //prevent propagation event from sensible children
      this.$_sliders.on('touchstart touchmove', 'input, button, textarea, select, a:not(".tc-slide-link")', function(ev) {
          ev.stopPropagation();
      });

      var _is_rtl = czrapp.$_body.hasClass('rtl');
      this.$_sliders.each( function() {
          $(this).hammer().on('swipeleft', function() {
              $(this).carousel( ! _is_rtl ? 'next' : 'prev' );
          });
          $(this).hammer().on('swiperight', function(){
              $(this).carousel( ! _is_rtl ? 'prev' : 'next' );
          });
      });
    },

    //Has to be fire on load after all other methods
    //@todo understand why...
    sliderTriggerSimpleLoad : function() {
      this.triggerSimpleLoad( this.$_sliders.find('.carousel-inner img') );
    }
  };//methods {}

  czrapp.methods.Czr_Slider = {};
  $.extend( czrapp.methods.Czr_Slider , _methods );

})(jQuery, czrapp);var czrapp = czrapp || {};

/************************************************
* USER EXPERIENCE SUB CLASS
*************************************************/
(function($, czrapp) {
  var _methods =  {
    init : function() {
      this.timer = 0;
      this.increment = 1;//used to wait a little bit after the first user scroll actions to trigger the timer
    },//init

    //Event Listener
    eventListener : function() {
      var self = this;

      czrapp.$_window.scroll( function() {
        self.eventHandler( 'scroll' );
      });

    },//eventListener


    //Event Handler
    eventHandler : function ( evt ) {
      var self = this;

      switch ( evt ) {
        case 'scroll' :
          //react to window scroll only when we have the btt-arrow element
          //I do this here 'cause I plan to pass the btt-arrow option as postMessage in customize
          if ( 0 === $('.tc-btt-wrapper').length )
            return;

          //use a timer
          if ( this.timer) {
            this.increment++;
            clearTimeout(self.timer);
          }
          if ( 1 == TCParams.timerOnScrollAllBrowsers ) {
            this.timer = setTimeout( function() {
              self.bttArrowVisibility();
            }, self.increment > 5 ? 50 : 0 );
          } else if ( czrapp.$_body.hasClass('ie') ) {
            this.timer = setTimeout( function() {
              self.bttArrowVisibility();
            }, self.increment > 5 ? 50 : 0 );
          }
        break;
      }
    },//eventHandler

    //SMOOTH SCROLL
    smoothScroll: function() {
      if ( TCParams.SmoothScroll && TCParams.SmoothScroll.Enabled )
        smoothScroll( TCParams.SmoothScroll.Options );
    },

    //SMOOTH SCROLL FOR AUTHORIZED LINK SELECTORS
    anchorSmoothScroll : function() {
      if ( ! TCParams.anchorSmoothScroll || 'easeOutExpo' != TCParams.anchorSmoothScroll )
            return;

      var _excl_sels = ( TCParams.anchorSmoothScrollExclude && _.isArray( TCParams.anchorSmoothScrollExclude.simple ) ) ? TCParams.anchorSmoothScrollExclude.simple.join(',') : '',
          self = this,
          $_links = $('a[href^="#"]', '#content').not(_excl_sels);

      //Deep exclusion
      //are ids and classes selectors allowed ?
      //all type of selectors (in the array) must pass the filter test
      _deep_excl = _.isObject( TCParams.anchorSmoothScrollExclude.deep ) ? TCParams.anchorSmoothScrollExclude.deep : null ;
      if ( _deep_excl )
        _links = _.toArray($_links).filter( function ( _el ) {
          return ( 2 == ( ['ids', 'classes'].filter( 
                        function( sel_type) { 
                            return self.isSelectorAllowed( $(_el), _deep_excl, sel_type); 
                        } ) ).length 
                );
        });
      $(_links).click( function () {
        var anchor_id = $(this).attr("href");

        //anchor el exists ?
        if ( ! $(anchor_id).length )
          return;

        if ('#' != anchor_id) {
            $('html, body').animate({
                scrollTop: $(anchor_id).offset().top
            }, 700, TCParams.anchorSmoothScroll);
        }
        return false;
      });//click
    },


    //Btt arrow visibility
    bttArrowVisibility : function () {
      if ( czrapp.$_window.scrollTop() > 100 )
        $('.tc-btt-wrapper').addClass('show');
      else
        $('.tc-btt-wrapper').removeClass('show');
    },//bttArrowVisibility



    //BACK TO TOP
    backToTop : function() {
      var $_html = $("html, body"),
          _backToTop = function($) {
            return ($.which > 0 || "mousedown" === $.type || "mousewheel" === $.type) && $_html.stop().off( "scroll mousedown DOMMouseScroll mousewheel keyup", _backToTop );
          };

      $(".back-to-top, .tc-btt-wrapper, .btt-arrow").on("click touchstart touchend", function ($) {
        $_html.on( "scroll mousedown DOMMouseScroll mousewheel keyup", _backToTop );
        $_html.animate({
            scrollTop: 0
        }, 1e3, function () {
            $_html.stop().off( "scroll mousedown DOMMouseScroll mousewheel keyup", _backToTop );
            //czrapp.$_window.trigger('resize');
        });
        $.preventDefault();
      });
    },


    //VARIOUS HOVER ACTION
    widgetsHoverActions : function() {
      $(".widget-front, article").hover(function () {
          $(this).addClass("hover");
      }, function () {
          $(this).removeClass("hover");
      });

      $(".widget li").hover(function () {
          $(this).addClass("on");
      }, function () {
          $(this).removeClass("on");
      });
    },


    //ATTACHMENT FADE EFFECT
    attachmentsFadeEffect : function() {
      $("article.attachment img").delay(500).animate({
            opacity: 1
        }, 700, function () {}
      );
    },


    //COMMENTS
    //Change classes of the comment reply and edit to make the whole button clickable (no filters offered in WP to do that)
    clickableCommentButton : function() {
      if ( ! TCParams.HasComments )
        return;

      //edit
      $('cite p.edit-link').each(function() {
        $(this).removeClass('btn btn-success btn-mini');
      });
      $('cite p.edit-link > a').each(function() {
        $(this).addClass('btn btn-success btn-mini');
      });

      //reply
      $('.comment .reply').each(function() {
        $(this).removeClass('btn btn-small');
      });
      $('.comment .reply .comment-reply-link').each(function() {
        $(this).addClass('btn btn-small');
      });
    },


    //DYNAMIC REORDERING
    //Detect layout and reorder content divs
    dynSidebarReorder : function() {
      //Enable reordering if option is checked in the customizer.
      if ( 1 != TCParams.ReorderBlocks )
        return;

      //fire on DOM READY and only for responsive devices
      if ( 'desktop' != this.getDevice() )
        this._reorderSidebars( 'responsive' );

      //fire on custom resize event
      var self = this;
      czrapp.$_body.on( 'tc-resize' , function(e, param) {
        param = _.isObject(param) ? param : {};
        var _to = 'desktop' != param.to ? 'responsive' : 'normal',
            _current = 'desktop' != param.current ? 'responsive' : 'normal';

        if ( _current != _to )
          self._reorderSidebars( _to );
      } );
    },


    //Reorder sidebar actions
    _reorderSidebars : function( _sidebarLayout ) {
      _sidebarLayout = _sidebarLayout || 'normal';
      var that = this,
          LeftSidebarClass    = TCParams.LeftSidebarClass || '.span3.left.tc-sidebar',
          RightSidebarClass   = TCParams.RightSidebarClass || '.span3.right.tc-sidebar',
          $_WindowWidth       = czrapp.$_window.width();

      //cache some $
      that.$_content      = that.$_content || $("#main-wrapper .container .article-container");
      that.$_left         = that.$_left || $("#main-wrapper .container " + LeftSidebarClass);
      that.$_right        = that.$_right || $("#main-wrapper .container " + RightSidebarClass);

      // check if we have iframes
      iframeContainers = that._has_iframe( { 'content' : this.$_content, 'left' : this.$_left } ) ;

      var leftIframe    = $.inArray('left', iframeContainers) > -1,
          contentIframe = $.inArray('content', iframeContainers) > -1;

      //both conain iframes => do nothing
      if ( leftIframe && contentIframe )
        return;    

      if ( that.$_left.length ) {
        if ( leftIframe )
          that.$_content[ _sidebarLayout === 'normal' ?  'insertAfter' : 'insertBefore']( that.$_left );
        else
          that.$_left[ _sidebarLayout === 'normal' ?  'insertBefore' : 'insertAfter']( that.$_content );
      } 
    },

    //Handle dropdown on click for multi-tier menus
    dropdownMenuEventsHandler : function() {
      var $dropdown_ahrefs    = $('.tc-open-on-click .menu-item.menu-item-has-children > a[href!="#"]'),
          $dropdown_submenus  = $('.tc-open-on-click .dropdown .dropdown-submenu');

      //go to the link if submenu is already opened
      $dropdown_ahrefs.on('tap click', function(evt) {
        if ( ( $(this).next('.dropdown-menu').css('visibility') != 'hidden' &&
                $(this).next('.dropdown-menu').is(':visible')  &&
                ! $(this).parent().hasClass('dropdown-submenu') ) ||
             ( $(this).next('.dropdown-menu').is(':visible') &&
                $(this).parent().hasClass('dropdown-submenu') ) )
            window.location = $(this).attr('href');
      });//.on()

      // make sub-submenus dropdown on click work
      $dropdown_submenus.each(function(){
        var $parent = $(this),
            $children = $parent.children('[data-toggle="dropdown"]');
        $children.on('tap click', function(){
            var submenu   = $(this).next('.dropdown-menu'),
                openthis  = false;
            if ( ! $parent.hasClass('open') ) {
              openthis = true;
            }
            // close opened submenus
            $($parent.parent()).children('.dropdown-submenu').each(function(){
                $(this).removeClass('open');
            });
            if ( openthis )
                $parent.addClass('open');

            return false;
        });//.on()
      });//.each()
    },

    //@return void()
    //simply toggles a "hover" class to the relevant elements
    menuButtonHover : function() {
      var $_menu_btns = $('.btn-toggle-nav');
      //BUTTON HOVER (with handler)
      $_menu_btns.hover(
        function( evt ) {
          $(this).addClass('hover');
        },
        function( evt ) {
          $(this).removeClass('hover');
        }
      );
    },


    //Mobile behaviour for the secondary menu
    secondMenuRespActions : function() {
      if ( ! TCParams.isSecondMenuEnabled )
        return;
      //Enable reordering if option is checked in the customizer.
      var userOption = TCParams.secondMenuRespSet || false,
          that = this;
      //if not a relevant option, abort
      if ( ! userOption || -1 == userOption.indexOf('in-sn') )
        return;

      //cache some $
      this.$_sec_menu_els  = this.$_sec_menu_els || $('.nav > li', '.tc-header .nav-collapse');
      this.$_sn_wrap       = this.$_sn_wrap || $('.sn-nav', '.sn-nav-wrapper');
      this.$_sec_menu_wrap = this.$_sec_menu_wrap || $('.nav', '.tc-header .nav-collapse');

      //fire on DOM READY
      var _locationOnDomReady = 'desktop' == this.getDevice() ? 'navbar' : 'side_nav';

      if ( 'desktop' != this.getDevice() )
        this._manageMenuSeparator( _locationOnDomReady , userOption)._moveSecondMenu( _locationOnDomReady , userOption );

      //fire on custom resize event
      czrapp.$_body.on( 'tc-resize', function( e, param ) {
        param = _.isObject(param) ? param : {};
        var _to = 'desktop' != param.to ? 'side_nav' : 'navbar',
            _current = 'desktop' != param.current ? 'side_nav' : 'navbar';

        if ( _current == _to )
          return;

        that._manageMenuSeparator( _to, userOption)._moveSecondMenu( _to, userOption );
      } );//.on()
    },

    _manageMenuSeparator : function( _to, userOption ) {
      //add/remove a separator between the two menus
      var that = this;
      if ( 'navbar' == _to )
        $( '.secondary-menu-separator', that.$_sn_wrap).remove();
      else {
        $_sep = $( '<li class="menu-item secondary-menu-separator"><hr class="featurette-divider"></hr></li>' );

        switch(userOption) {
          case 'in-sn-before' :
            this.$_sn_wrap.prepend($_sep);
          break;

          case 'in-sn-after' :
            this.$_sn_wrap.append($_sep);
          break;
        }
      }
      return this;
    },


    //@return void()
    //@param _where = menu items location string 'navbar' or 'side_nav'
    _moveSecondMenu : function( _where, userOption ) {
      _where = _where || 'side_nav';
      var that = this;
      switch( _where ) {
          case 'navbar' :
            that.$_sec_menu_wrap.append(that.$_sec_menu_els);
          break;

          case 'side_nav' :
            if ( 'in-sn-before' == userOption )
              that.$_sn_wrap.prepend(that.$_sec_menu_els);
            else
              that.$_sn_wrap.append(that.$_sec_menu_els);
          break;
        }
    },

    //Helpers
    
    //Check if the passed element(s) contains an iframe
    //@return list of containers
    //@param $_elements = mixed
    _has_iframe : function ( $_elements ) {
      var that = this,
          to_return = [];
      _.map( $_elements, function( $_el, container ){
        if ( $_el.length > 0 && $_el.find('IFRAME').length > 0 )
          to_return.push(container);
      });
      return to_return;
    }

  };//_methods{}

  czrapp.methods.Czr_UserExperience = {};
  $.extend( czrapp.methods.Czr_UserExperience , _methods );

})(jQuery, czrapp);
var czrapp = czrapp || {};
/************************************************
* STICKY HEADER SUB CLASS
*************************************************/
(function($, czrapp) {
  var _methods =  {
    init : function() {
      //cache jQuery el
      this.$_sticky_logo    = $('img.sticky', '.site-logo');
      this.$_resetMarginTop = $('#tc-reset-margin-top');
      //subclass properties
      this.elToHide         = []; //[ '.social-block' , '.site-description' ],
      this.customOffset     = TCParams.stickyCustomOffset || {};// defaults : { _initial : 0, _scrolling : 0 }
      this.logo             = 0 === this.$_sticky_logo.length ? { _logo: $('img:not(".sticky")', '.site-logo') , _ratio: '' }: false;
      this.timer            = 0;
      this.increment        = 1;//used to wait a little bit after the first user scroll actions to trigger the timer
      this.triggerHeight    = 20; //0.5 * windowHeight;

      this.scrollingDelay   = 1 != TCParams.timerOnScrollAllBrowsers && czrapp.$_body.hasClass('ie') ? 50 : 5;
    },//init()


    triggerStickyHeaderLoad : function() {
      if ( ! this._is_sticky_enabled() )
        return;

      //LOADING ACTIONS
      czrapp.$_body.trigger( 'sticky-enabled-on-load' , { on : 'load' } );
    },


    stickyHeaderEventListener : function() {
      //LOADING ACTIONS
      var self = this;
      czrapp.$_body.on( 'sticky-enabled-on-load' , function() {
        self.stickyHeaderEventHandler('on-load');
      });//.on()

      //RESIZING ACTIONS
      czrapp.$_window.on( 'tc-resize', function() {
        self.stickyHeaderEventHandler('resize');
      });

      //SCROLLING ACTIONS
      czrapp.$_window.scroll( function() {
        self.stickyHeaderEventHandler('scroll');
      });

      //SIDENAV ACTIONS => recalculate the top offset on sidenav toggle
      czrapp.$_body.on( czrapp.$_body.hasClass('tc-is-mobile') ? 'touchstart' : 'click' , '.sn-toggle', function() {
        self.stickyHeaderEventHandler('sidenav-toggle');
      });
    },



    stickyHeaderEventHandler : function( evt ) {
      if ( ! this._is_sticky_enabled() )
        return;

      var self = this;

      switch ( evt ) {
        case 'on-load' :
          self._prepare_logo_transition();
          setTimeout( function() {
            self._sticky_refresh();
            self._sticky_header_scrolling_actions();
          } , 20 );//setTimeout()
        break;

        case 'scroll' :
          var _delay = 0;

           //use a timer
          if ( this.timer) {
            this.increment++;
            clearTimeout(self.timer);
          }

          if ( this.increment > 5 )
            //decrease the scrolling trigger delay when smoothscroll on to avoid not catching the scroll when scrolling fast and sticky header not already triggered
            _delay = ! ( czrapp.$_body.hasClass('tc-smoothscroll') && ! this._is_scrolling() ) ? this.scrollingDelay : 15;

          this.timer = setTimeout( function() {
              self._sticky_header_scrolling_actions();
          }, _delay );
        break;

        case 'resize' :
        case 'sidenav-toggle' :
          self._set_sticky_offsets();
          self._set_header_top_offset();
          self._set_logo_height();
        break;
      }
    },




    //STICKY HEADER SUB CLASS HELPER (private like)
    _is_scrolling : function() {
      return czrapp.$_body.hasClass('sticky-enabled') ? true : false;
    },

    //STICKY HEADER SUB CLASS HELPER (private like)
    _is_sticky_enabled : function() {
      return czrapp.$_body.hasClass('tc-sticky-header') ? true : false;
    },

    //STICKY HEADER SUB CLASS HELPER (private like)
    _get_top_offset : function() {
      //initialOffset     = ( 1 == isUserLogged &&  580 < $(window).width() ) ? $('#wpadminbar').height() : 0;
      //custom offset : are we scrolling ? => 2 custom top offset values can be defined by users : initial and scrolling
      //make sure custom offset are set and numbers
      var initialOffset   = 0,
          that            = this,
          customOffset    = +this._get_custom_offset( that._is_scrolling() ? '_scrolling' : '_initial' );

      if ( 1 == this.isUserLogged() && ! this.isCustomizing() ) {
        if ( 580 < czrapp.$_window.width() )
          initialOffset = czrapp.$_wpadminbar.height();
        else
          initialOffset = ! this._is_scrolling() ? czrapp.$_wpadminbar.height() : 0;
      }
      return initialOffset + customOffset ;
    },


    //CUSTOM TOP OFFSET
    //return the user defined dynamic or static custom offset
    //custom offset is a localized param that can be passed with the wp filter : tc_sticky_custom_offset
    //its default value is an object : { _initial : 0, _scrolling : 0, options : { _static : true, _element : "" }
    //if _static is set to false and a dom element is provided, then the custom offset will be the calculated height of the element
    _get_custom_offset : function( _context ) {
      //Always check if this.customOffset is well formed
      if ( _.isEmpty( this.customOffset ) )
        return 0;
      if ( ! this.customOffset[_context] )
        return 0;
      if ( ! this.customOffset.options )
        return this.customOffset[_context];

      //always return a static value for the scrolling context;
      if ( '_scrolling' == _context )
        return +this.customOffset[_context] || 0;

      //INITIAL CONTEXT
      //CASE 1 : STATIC
      if ( this.customOffset.options._static )
        return +this.customOffset[_context] || 0;

      var that = this,
          $_el = $(that.customOffset.options._element);

      //CASE 2 : DYNAMIC : based on an element's height
      //does the element exists?
      if ( ! $_el.length )
        return 0;
      else {
        return $_el.outerHeight() || +this.customOffset[_context] || 0;
      }
      return;
    },




    //STICKY HEADER SUB CLASS HELPER (private like)
    _set_sticky_offsets : function() {
      var self = this;

      //Reset all values first
      czrapp.$_tcHeader.css('top' , '');
      czrapp.$_tcHeader.css('height' , 'auto' );
      this.$_resetMarginTop.css('margin-top' , '' ).show();

      //What is the initial offset of the header ?
      var headerHeight    = czrapp.$_tcHeader.outerHeight(true); /* include borders and eventual margins (true param)*/
      //set initial margin-top = initial offset + header's height
      this.$_resetMarginTop.css('margin-top' , + headerHeight  + 'px');
    },

    //STICKY HEADER SUB CLASS HELPER (private like)
    _set_header_top_offset : function() {
      var self = this;
      //set header initial offset
      czrapp.$_tcHeader.css('top' , self._get_top_offset() );
    },

    //STICKY HEADER SUB CLASS HELPER (private like)
    _prepare_logo_transition : function(){
      //do nothing if the browser doesn't support csstransitions (modernizr)
      //or if no logo (includes the case where we have two logos, normal and sticky one)
      if ( ! ( czrapp.$_html.hasClass('csstransitions') && ( this.logo && 0 !== this.logo._logo.length ) ) )
        return;

      var logoW = this.logo._logo.originalWidth(),
          logoH = this.logo._logo.originalHeight();

      //check that all numbers are valid before using division
      if ( 0 === _.size( _.filter( [ logoW, logoH ], function(num){ return _.isNumber( parseInt(num, 10) ) && 0 !== num; } ) ) )
        return;

      this.logo._ratio = logoW / logoH;
      this.logo._logo.css('width' , logoW );
    },

    //STICKY HEADER SUB CLASS HELPER (private like)
    _set_logo_height : function(){
      if ( this.logo && 0 === this.logo._logo.length || ! this.logo._ratio )
        return;
      var self = this;
      this.logo._logo.css('height' , self.logo._logo.width() / self.logo._ratio );

      setTimeout( function() {
          self._set_sticky_offsets();
          self._set_header_top_offset();
      } , 200 );
    },

    _sticky_refresh : function() {
      var self = this;
      setTimeout( function() {
          self._set_sticky_offsets();
          self._set_header_top_offset();
      } , 20 );
      czrapp.$_window.trigger('resize');
    },


    //SCROLLING ACTIONS
    _sticky_header_scrolling_actions : function() {
      this._set_header_top_offset();

      var self = this;
      //process scrolling actions
      if ( czrapp.$_window.scrollTop() > this.triggerHeight ) {
        if ( ! this._is_scrolling() ) {
          czrapp.$_body.addClass("sticky-enabled").removeClass("sticky-disabled");
          // set the logo height, makes sense just when the logo isn't shrinked
          if ( ! czrapp.$_tcHeader.hasClass('tc-shrink-on') )
            self._set_logo_height();
        }
      }
      else if ( this._is_scrolling() ){
        czrapp.$_body.removeClass("sticky-enabled").addClass("sticky-disabled");
        setTimeout( function() { self._sticky_refresh(); } ,
          self.isCustomizing ? 100 : 20
        );
        //additional refresh for some edge cases like big logos
        setTimeout( function() { self._sticky_refresh(); } , 200 );
      }
    }
  };//_methods{}

  czrapp.methods.Czr_StickyHeader = {};
  $.extend( czrapp.methods.Czr_StickyHeader , _methods );

})(jQuery, czrapp);
var czrapp = czrapp || {};
/************************************************
* STICKY FOOTER SUB CLASS
*************************************************/
(function($, czrapp) {
  var _methods =  {
    init : function() {
      this.$_push   = $('#tc-push-footer');
      this._class   = 'sticky-footer-enabled';
      this.$_page   = $('#tc-page-wrap');
      
      if ( 1 != TCParams.stickyHeader ) {//sticky header fires a resize
        var self = this;
        setTimeout( function() {
                self._apply_sticky_footer(); }, 50 
        );
      }
    },

    /***********************************************
    * DOM EVENT LISTENERS AND HANDLERS
    ***********************************************/
    stickyFooterEventListener : function() {
      var self = this;

      // maybe apply sticky footer on window resize
      czrapp.$_window.on( 'tc-resize', function() {
        self.stickyFooterEventHandler('resize');
      });

      // maybe apply sticky footer on golden ratio applied
      czrapp.$_window.on( 'golden-ratio-applied', function() {
        self.stickyFooterEventHandler('refresh');
      });

      /* can be useful without exposing methods make it react to this event which could be externally fired, used in the preview atm */
      czrapp.$_body.on( 'refresh-sticky-footer', function() {
        self.stickyFooterEventHandler('refresh');
      });

    },
    
    stickyFooterEventHandler : function( evt ) {
      var self = this;

      if ( ! this._is_sticky_footer_enabled() )
        return;

      switch ( evt ) {
        case 'resize':
          //to avoid the creation of a function inside a loop
          //but still allow the access to "this"
          var func = function() { return self._apply_sticky_footer() ;};
          for ( var i = 0; i<5; i++ ) /* I've seen something like that in twentyfifteen */
            setTimeout( func, 50 * i);
        break;
        case 'refresh':
          this._apply_sticky_footer();
        break;
      }
    },
    /* We apply the "sticky" footer by setting the height of the push div, and adding the proper class to show it */
    _apply_sticky_footer : function() {

      var  _f_height     = this._get_full_height(),
           _w_height     = czrapp.$_window.height(),
           _push_height  = _w_height - _f_height,
           _event        = false;
      
      if ( _push_height > 0 ) {
        this.$_push.css('height', _push_height).addClass(this._class);
        _event = 'sticky-footer-on';
      }else if ( this.$_push.hasClass(this._class) ) {
        this.$_push.removeClass(this._class);
        _event = 'sticky-footer-off';
      }

      /* Fire an event which something might listen to */
      if ( _event )
        czrapp.$_body.trigger(_event);    
    },
    
    //STICKY HEADER SUB CLASS HELPER (private like)
    /*
    * return @bool: whether apply or not the sticky-footer
    */
    _is_sticky_footer_enabled : function() {
      return czrapp.$_body.hasClass('tc-sticky-footer');
    },


    //STICKY HEADER SUB CLASS HELPER (private like)
    /* 
    * return @int: the potential height value of the page
    */
    _get_full_height : function() {
      var _full_height = this.$_page.outerHeight(true) + this.$_page.offset().top,
          _push_height = 'block' == this.$_push.css('display') ? this.$_push.outerHeight() : 0;
            
      return _full_height - _push_height;
    }
  };//_methods{}

  czrapp.methods.Czr_StickyFooter = {};
  $.extend( czrapp.methods.Czr_StickyFooter , _methods );

})(jQuery, czrapp);
var czrapp = czrapp || {};
/************************************************
* SIDE NAV SUB CLASS
*************************************************/
(function($, czrapp) {
  var _methods =  {
    init : function() {
      this.$_sidenav                = $( '#tc-sn' );

      if ( ! this._is_sn_on() )
        return;

      //cache jQuery el
      this.$_page_wrapper           = $('#tc-page-wrap');
      this.$_page_wrapper_node      = this.$_page_wrapper.get(0);
      this.$_page_wrapper_btn       = $('.btn-toggle-nav', '#tc-page-wrap');

      this.$_sidenav_inner          = $( '.tc-sn-inner', this.$_sidenav);

      this._toggle_event            = czrapp.$_body.hasClass('tc-is-mobile') ? 'touchstart' : 'click';

      this._browser_can_translate3d = ! czrapp.$_html.hasClass('no-csstransforms3d');

      /* Cross browser support for CSS "transition end" event */
      this.transitionEnd            = 'transitionend webkitTransitionEnd otransitionend oTransitionEnd MSTransitionEnd';

      //fire event listener
      this.sideNavEventListener();

      this._set_offset_height();

    },//init()

    /***********************************************
    * DOM EVENT LISTENERS AND HANDLERS
    ***********************************************/
    sideNavEventListener : function() {
      var self = this;

      //BUTTON CLICK/TAP
      czrapp.$_body.on( this._toggle_event, '.sn-toggle', function( evt ) {
        self.sideNavEventHandler( evt, 'toggle' );
      });

      //TRANSITION END
      this.$_page_wrapper.on( this.transitionEnd, function( evt ) {
        self.sideNavEventHandler( evt, 'transitionend' );
      });

      //RESIZING ACTIONS
      czrapp.$_window.on('tc-resize', function( evt ) {
        self.sideNavEventHandler( evt, 'resize');
      });

      czrapp.$_window.scroll( function( evt ) {
        self.sideNavEventHandler( evt, 'scroll');
      });
    },


    sideNavEventHandler : function( evt, evt_name ) {
      var self = this;

      switch ( evt_name ) {
        case 'toggle':
          // prevent multiple firing of the click event
          if ( ! this._is_translating() )
            this._toggle_callback( evt );
        break;

        case 'transitionend' :
           // react to the transitionend just if translating
           if ( this._is_translating() && evt.target == this.$_page_wrapper_node )
             this._transition_end_callback();
        break;

        case 'scroll' :
        case 'resize' :
          setTimeout( function(){
              self._set_offset_height();
          }, 200);
        break;
      }
    },


    _toggle_callback : function ( evt ){
      evt.preventDefault();

      if ( czrapp.$_body.hasClass( 'tc-sn-visible' ) )
        this._anim_type = 'sn-close';
      else
        this._anim_type = 'sn-open';

      //2 cases translation enabled or disabled.
      //=> if translation3D enabled, the _transition_end_callback is fired at the end of anim by the transitionEnd event
      if ( this._browser_can_translate3d ){
        /* When the toggle menu link is clicked, animation starts */
        czrapp.$_body.addClass( 'animating ' + this._anim_type )
                     .trigger( this._anim_type + '_start' );
        if ( this._is_sticky_header() ){
          /* while animating disable sticky header if not scrolling */
          if ( czrapp.$_body.hasClass('sticky-disabled') )
            czrapp.$_body.removeClass('tc-sticky-header');
        }
      } else {
        czrapp.$_body.toggleClass('tc-sn-visible')
                     .trigger( this._anim_type );
      }

      //handles the page wrapper button fade in / out on click
      var _event = evt || event,
          $_clicked_btn = $( _event.target ),
          _is_opening   = $('#tc-page-wrap').has( $_clicked_btn).length > 0;

      this.$_page_wrapper_btn.each( function(){
        $(this).fadeTo( 500 , _is_opening ? 0 : 1 , function() {
          $(this).css( "visibility", _is_opening ? "hidden" : "visible");
        }); //.fadeTo() duration, opacity, callback
      } );
      return false;
   },

   _transition_end_callback : function() {
     czrapp.$_body.removeClass( 'animating ' +  this._anim_type)
                  .toggleClass( 'tc-sn-visible' )
                  .trigger( this._anim_type + '_end' );

     /* on transition end re-set sticky header */
     if ( this._is_sticky_header() ){
       if ( czrapp.$_body.hasClass('sticky-disabled') )
         czrapp.$_body.addClass('tc-sticky-header');
      }
    },



    /***********************************************
    * HELPERS
    ***********************************************/
    //SIDE NAV SUB CLASS HELPER (private like)
    _is_sn_on : function() {
      return this.$_sidenav.length > 0 ? true : false;
    },

    //SIDE NAV SUB CLASS HELPER (private like)
    _get_initial_offset : function() {
      var _initial_offset = czrapp.$_wpadminbar.length > 0 ? czrapp.$_wpadminbar.height() : 0;
      _initial_offset = _initial_offset && czrapp.$_window.scrollTop() && 'absolute' == czrapp.$_wpadminbar.css('position') ? 0 : _initial_offset;

      return _initial_offset; /* add a custom offset ?*/
    },

    //SIDE NAV SUB CLASS HELPER (private like)
    _set_offset_height : function() {
      var _offset = this._get_initial_offset();

      this.$_sidenav.css('top', _offset );
      this.$_sidenav_inner.css('max-height', this.$_sidenav.outerHeight() - _offset);
    },

    //SIDE NAV SUB CLASS HELPER (private like)
    _is_translating : function() {
      return czrapp.$_body.hasClass('animating');
    },

    //SIDE NAV SUB CLASS HELPER (private like)
    _is_sticky_header : function() {
      this.__is_sticky_header = this.__is_sticky_header || czrapp.$_body.hasClass('tc-sticky-header');
      return this.__is_sticky_header;
    }

  };//_methods{}

  czrapp.methods.Czr_SideNav = {};
  $.extend( czrapp.methods.Czr_SideNav , _methods );

})(jQuery, czrapp);var czrapp = czrapp || {};

/************************************************
* LET'S DANCE
*************************************************/
jQuery(function ($) {
  var toLoad = {
    BrowserDetect : [],
    Czr_Plugins : ['centerImagesWithDelay', 'imgSmartLoad' , 'dropCaps', 'extLinks' , 'fancyBox'],
    Czr_Slider : ['fireSliders', 'manageHoverClass', 'centerSliderArrows', 'addSwipeSupport', 'sliderTriggerSimpleLoad'],
    Czr_UserExperience : ['eventListener', 'smoothScroll', 'anchorSmoothScroll', 'backToTop', 'widgetsHoverActions', 'attachmentsFadeEffect', 'clickableCommentButton', 'dynSidebarReorder', 'dropdownMenuEventsHandler', 'menuButtonHover', 'secondMenuRespActions'],
    Czr_StickyHeader : ['stickyHeaderEventListener', 'triggerStickyHeaderLoad' ],
    Czr_StickyFooter : ['stickyFooterEventListener'],
    Czr_SideNav : []
  };
  czrapp.cacheProp().emitCustomEvents().loadCzr(toLoad);
});
