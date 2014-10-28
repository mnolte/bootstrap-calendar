!function(root, factory) {
	
	var pluginName	= 'bootstrapCalendar';
	
	if (typeof define === 'function' && define.amd) {
		define(['jquery', 'moment', 'underscore'], function($, moment, _) {
			root[pluginName] = factory(pluginName, root, $, moment, _);
		});
	} else {
		root[pluginName] = factory(pluginName, root, (root.jQuery || root.$), root.moment, root._);
	}
	
}(this, function(pluginName, root, $, moment, _) {

	// Uppercase first letter in string
	String.prototype.ucfirst = function() {
		return this.charAt(0).toUpperCase() + this.slice(1);
	}
	 
	// Default options
	var defaults = {
		date			: 'now',
		view			: 'month',
		locale			: 'en',
		events			: false,
		classes			: {
			header			: '.calendar-header',
			headerTitle		: '.calendar-title',
			container		: '.calendar-container'
		},
		templates_path	: 'templates/'
	},

	// Private methods
	methods	= {

		// Initialize Plugin
		initialize 		: function ( instance ) {

			// Set locale
			instance.setLocale(instance.options.locale);

			// Render view
			instance.render(instance.options.date);

			// Initialize events inside wrapper
			instance.$wrapper
			// Initialize navigate view click events
			.on('click.bs.calendar', '*[data-calendar-view]', function(e){
				e.preventDefault();
				var $el = $(this);
				instance.navigate('view', $el.data('calendar-view'), $el.data('calendar-date'));
			})
			// Initialize navigate date click events
			.on('click.bs.calendar', '*[data-calendar-goto]', function(e){
				e.preventDefault();
				var $el = $(this);
				instance.navigate('goto', $el.data('calendar-goto'), $el.data('calendar-date'));
			});

		},

		// Load view template
		loadTemplate	: function ( instance, name) {

			// Check template already exists in constants
			if (instance.constants.templates[name])
			{
				return;
			}
			else
			{
				// Fetch template from server
				$.ajax({
					url		: instance.options.templates_path + name + '.html',
					dataType: 'html',
					type	: 'GET',
					async	: false,
				}).done(function(html) {
					
					// Store template in constants (for later use when generating templates)
					instance.constants.templates[name] = _.template(html);
					
				});
			}
		},

		// Select loaded events in given timespan
		selectEvents	: function ( events, start, end ) {

			// Init selection
			var selection = [];

			// Find selection in bulk
			$.each(events, function (i, event) {
				if ((start <= event.start && end > event.start) || (start <= event.end && end > event.end) || (start > event.start && end <= event.end)) {
					selection.push(event);
				} 
			});

			// Return events selection
			return selection;
			
		}
		
	},
	 
	// Constructor, initialise everything you need here
	Plugin = function (element, options) {

		this._defaults 	= defaults;
        this._name	   	= pluginName;
		this.element 	= element;
		this.options 	= options;
		this.constants	= {
			views				: ['year','month','week'],
			templates			: {},
			months				: [],
			weekdays			: [],
			weekdaysShort		: [],
			weekdaysMin			: [],
			position			: { date: null, start: null, end: null },
			data				: {
				events	: [],
			}
		};

		// Get DOM elements
		this.$wrapper		= $(this.element);
		this.$header		= this.$wrapper.find(this.options.classes.header).first();
		this.$headerTitle	= this.$header.find(this.options.classes.headerTitle).first();
		this.$container		= this.$wrapper.find(this.options.classes.container).first();

		// Initialize Plugin
		methods.initialize(this);
		
	};
	 
	// Plugin public methods and shared properties
	Plugin.prototype = {
		
		// Reset constructor
		constructor	: Plugin,

		// Set Calendar Locale
		setLocale	: function (locale) {

			// Define locale
			locale		= typeof locale === 'string' ? locale : this.options.locale,
			localeData	= moment.localeData(),
			weekday		= moment();

			// Set locale
			moment.locale(this.options.locale = locale);

			// Set locale months
			this.constants.months = moment.months();
			
			// Generate locale weekdays 
			this.constants.weekdays 	 = [];
			this.constants.weekdaysShort = [];
			this.constants.weekdaysMin	 = [];
			for (i = 0; i < 7; i++) {
				weekday.weekday(i);
				this.constants.weekdays.push(localeData.weekdays(weekday));
				this.constants.weekdaysShort.push(localeData.weekdaysShort(weekday));
				this.constants.weekdaysMin.push(localeData.weekdaysMin(weekday));
			}

			// Make chainable
			return this;
			
		},

		// Navigate Calendar
		navigate	: function ( type, value, date ) {

			// Trigger beforeNavigate event
			this.$wrapper.trigger('beforeNavigate.bs.calendar', [this]);

			// Navigate by type
			switch (type) {
				case 'view'	:
					if( $.inArray(value, this.constants.views) !== -1 ) {
						date = typeof date === 'string' ? moment(date) : this.constants.position.date;
						this.options.view = value;						
					} else {
						$.error(pluginName + ': invalid view: ' + value);
					}
					break;
				case 'goto'	:
					if( $.inArray(value, ['prev','next','today']) !== -1 ) {
						if (value === 'today') {
							date = moment();
						} else
						if (value === 'prev' && this.options.view === 'year') {
							date = moment(this.constants.position.start).subtract(1, 'year');
						} else
						if (value === 'prev' && this.options.view === 'month') {
							date = moment(this.constants.position.start).subtract(1, 'months');
						} else
						if (value === 'prev' && this.options.view === 'week') {
							date = moment(this.constants.position.start).subtract(7, 'days');
						} else
						if (value === 'next' && this.options.view === 'year') {
							date = moment(this.constants.position.start).add(1, 'year');
						} else
						if (value === 'next' && this.options.view === 'month') {
							date = moment(this.constants.position.start).add(1, 'months');
						} else
						if (value === 'next' && this.options.view === 'week') {
							date = moment(this.constants.position.start).add(7, 'days');
						}				
					} else {
						$.error(pluginName + ': invalid goto: ' + value);
					}
					break;
				default:
					$.error(pluginName + ': invalid type: ' + type);
			}

			// Trigger afterNavigate event
			this.$wrapper.trigger('afterNavigate.bs.calendar', [this]);
			
			// Render view
			this.render(date.format('YYYY-MM-DD'));
			
		},

		// Render Calender View
		render			: function (setDate) {

			// Trigger beforeRender event
			this.$wrapper.trigger('beforeRender.bs.calendar', [this]);

			// Define parameters
			var instance = this,
				data  	 = {
					instance		: instance,
					now				: moment(),
					position		: { date: null, start: null, end: null },
					events			: []
				},
				title, year, month, day;
				
			// Set position date
			setDate	= typeof setDate === 'string' ? setDate : instance.constants.position.date.format('YYYY-MM-DD')
			if (setDate === 'now') {
				data.position.date = moment();
			} else
			if (setDate.match(/^\d{4}-\d{2}-\d{2}$/g)) {
				data.position.date = moment(setDate, 'YYYY-MM-DD');
			} else {
				$.error(pluginName + ': invalid format: ' + setDate);
			}
			year  = data.position.date.year();
			month = data.position.date.month();
			day	  = data.position.date.date();

			// Set data by view
			switch( instance.options.view )
			{
				case 'year':
					data.position.start	= moment(new Date(year, 0, 1))
					data.position.end	= moment(data.position.start).add(1, 'years')
					data.counter		= moment(data.position.start);
					data.end			= moment(data.position.end);
					title				= data.position.date.format('YYYY');
					break;
				case 'month':
					data.position.start	= moment(new Date(year, month, 1));
					data.position.end	= moment(data.position.start).add(1, 'months');
					data.counter		= moment(data.position.start).weekday(0);
					data.end			= data.position.end.weekday() === 0 ? moment(data.position.end) : moment(data.position.end).weekday(7);
					title				= data.position.date.format('MMMM YYYY');
					break;
				case 'week':
					data.week			= moment(new Date(year, month, day)).week();
					data.position.start	= moment(new Date(year, month, day)).week(data.week).weekday(0);
					data.position.end	= moment(new Date(year, month, day)).week(data.week).weekday(7);
					data.counter		= moment(data.position.start);
					data.end			= moment(data.position.end);
					title				= moment(data.position.end).subtract(1, 'milliseconds').format('YYYY | % w').replace('%', 'wk');
					break;
				default:
					$.error(pluginName + ': invalid view: ' + instance.options.view);
			}

			// Store position in constants (for later use when navigating)
			instance.constants.position = data.position;

			// Store events in constants (for later use when generating templates)
			instance.constants.data.events = instance.options.events;

			// Set events
			if (typeof instance.constants.data.events === 'object') {
				data.events = methods.selectEvents(instance.constants.data.events, data.counter.format('YYYY-MM-DD HH:mm:ss'), data.end.format('YYYY-MM-DD HH:mm:ss'));
			}

			// Clear container
			instance.$container.empty();

			// Set title
			instance.$headerTitle.html(title.ucfirst());

			// Load template
			methods.loadTemplate(instance, instance.options.view);

			// Insert rendered template
			$.when(instance.$container.html(instance.constants.templates[instance.options.view](data))).then(function(){
				
				// Trigger afterRender event
				instance.$wrapper.trigger('afterRender.bs.calendar', [instance]);

				// Trigger renderEvents event
				instance.$wrapper.trigger('renderEvents.bs.calendar', [data.events]);
				
			});
				
		},

		// Render section template
		renderSection	: function ( aMoment ) {

			// Get instance and define parameters
			var templateName,
				data = {
					start	: moment(aMoment),
					end		: moment(aMoment),
					events	: false
				};

			// Set type
			switch( this.options.view )
			{
				case 'year'	:
					templateName = 'year-month';
					data.end.add(1, 'months');
					break;
				case 'month':
					templateName = 'month-day';
					data.end.add(1, 'days');
					break;
				case 'week'	:
					templateName = 'week-day';
					data.end.add(1, 'days');
					break;
				default:
					$.error(pluginName + ': invalid view: ' + this.options.view);
			}

			// Load template
			methods.loadTemplate(this, templateName);

			// Set events
			if (typeof this.constants.data.events === 'object') {
				data.events = methods.selectEvents(this.constants.data.events, data.start.format('YYYY-MM-DD HH:mm:ss'), data.end.format('YYYY-MM-DD HH:mm:ss'));
			}

			// Return rendered template
			return this.constants.templates[templateName](data);
			
		}
		
	};

	// Create the jQuery plugin
	$.fn[pluginName] = function(options) {
		
		options = $.extend(true, {}, defaults, options);
		
		return this.each(function() {
			
			var $this = $(this);
			
			$this.data(pluginName, new Plugin($this, options));
			
		});
		
	};
	 
	// Expose defaults and Constructor
	$.fn[pluginName].defaults	= defaults;
	$.fn[pluginName].Plugin		= Plugin;
});
