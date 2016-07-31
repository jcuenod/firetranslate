/*jshint esversion: 6 */

function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
var chapterData = {
	"Genesis": 50,
	"Exodus": 40,
	"Leviticus": 27,
	"Numbers": 36,
	"Deuteronomy": 34,
	"Joshua": 24,
	"Judges": 21,
	"Ruth": 4,
	"1 Samuel": 31,
	"2 Samuel": 24,
	"1 Kings": 22,
	"2 Kings": 25,
	"1 Chronicles": 29,
	"2 Chronicles": 36,
	"Ezra": 10,
	"Nehemiah": 13,
	"Esther": 10,
	"Job": 42,
	"Psalms": 150,
	"Proverbs": 31,
	"Ecclesiastes": 12,
	"Song of Songs": 8,
	"Isaiah": 66,
	"Jeremiah": 52,
	"Lamentations": 5,
	"Ezekiel": 48,
	"Daniel": 12,
	"Hosea": 14,
	"Joel": 3,
	"Amos": 9,
	"Obadiah": 1,
	"Jonah": 4,
	"Micah": 7,
	"Nahum": 3,
	"Habakkuk": 3,
	"Zephaniah": 3,
	"Haggai": 2,
	"Zechariah": 14,
	"Malachi": 3,
	"Matthew": 28,
	"Mark": 16,
	"Luke": 24,
	"John": 21,
	"Acts": 28,
	"Romans": 16,
	"1 Corinthians": 16,
	"2 Corinthians": 13,
	"Galatians": 6,
	"Ephesians": 6,
	"Philippians": 4,
	"Colossians": 4,
	"1 Thessalonians": 5,
	"2 Thessalonians": 3,
	"1 Timothy": 6,
	"2 Timothy": 4,
	"Titus": 3,
	"Philemon": 1,
	"Hebrews": 13,
	"James": 5,
	"1 Peter": 5,
	"2 Peter": 3,
	"1 John": 5,
	"2 John": 1,
	"3 John": 1,
	"Jude": 1,
	"Revelation": 22
};
var prevent_update = false;
var reference_string = "matthew_001";
var defaultSelection = { book: "Matthew", chapter: 1 };
var reference_object = {
	books: Object.keys(chapterData),
	chapters: chapterData,
	selection: defaultSelection
};

var range = (l,r) => new Array(r - l).fill().map((_,k) => k + l);

var debounce = {};
var ractive_user;
var user_id;
var ractive_translation;
var just_loaded_array = [];
var just_set_userOptions = false;
var initialLoad = true;
var userOptions = {
	selection: defaultSelection
};
var userData = {};
var no_keys_pushed_yet = true;

// Initialize Firebase
var config = {
	apiKey: "AIzaSyAQZnXRYo_MPZJCPSdit2LU6iv2ujs1RPs",
	authDomain: "firetranslate-5c0ca.firebaseapp.com",
	databaseURL: "https://firetranslate-5c0ca.firebaseio.com",
	storageBucket: "",
};
firebase.initializeApp(config);

function updateUserData(keypath, newValue) {
	if (no_keys_pushed_yet)
	{
		console.log("no keys pushed yet");
		return;
	}

	if (typeof debounce[keypath] !== "undefined")
	{
		console.log("skipped: " + keypath);
		clearTimeout(debounce[keypath]);
	}

	debounce[keypath] = setTimeout(function() {
		if (!user_id) {
			console.log("need to be logged in smarty pants");
			return;
		}
		var data = {};
		var keyName = keypath.slice(keypath.lastIndexOf(".") + 1);
		data[keyName] = newValue;
		var path = 'users/' + user_id + "/" + reference_string + "/" + keypath.slice(5, keypath.lastIndexOf(".")).replace(/\./g, "/");
		firebase.database().ref(path).update(data);
		console.log("updateUserData: " + keypath);
	}, 400);
}
function loadData() {
	var setData = function(d, reset_prevent) {
		if (!Array.isArray(d.verses))
		{
			var key = Object.keys(d.verses)[0];
			var value = d.verses[key];
			d.verses = [];
			d.verses[key] = value;
		}
		userData = $.extend(true, userData, d);
		just_loaded_array = [];
		ractive_translation.set("list", userData);
		if (reset_prevent)
			prevent_update = false;
	};
	firebase.database().ref('bibledata/' + reference_string).once('value', function(snapshot) {
		no_keys_pushed_yet = true;
		var data = snapshot.val();

		// The Tanach data has some superscriptions to help the user but I don't
		// want them at this stage (they have no explanations). So we just
		// remove them at this point. We can add them with bdi later...
		data.verses.map(function(obj){
			if ('wlc' in obj)
			{
				// we also need to use triple braces in the html {{{wlc}}}
				// ractive will not allow html to display...
				// obj.wlc = obj.wlc.replace(/(\[.+?\])/g,"<bdi>$1</bdi>");
				obj.wlc = obj.wlc.replace(/(\[.+?\])/g,"");
			}
			return obj;
		});

		$('body, html').animate({ scrollTop: 0 }, 500);
		userData = {};
		setData(data);
		firebase.database().ref('/users/' + user_id + "/" + reference_string).once('value', function(snapshot) {
			data = snapshot.val();
			if (data !== null)
				setData(data, true);
			else
				prevent_update = false;
		});
	});
}


var provider = new firebase.auth.GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/plus.login');

function login() {
	firebase.auth().signInWithPopup(provider);
}

function logout() {
	firebase.auth().signOut();
}

$(document).on("ready", function() {
	ractive_translation = new Ractive({
		el: "#targetTable",
		template: "#template",
		data: {
			list: userData
		}
	});
	ractive_translation.observe('list.verses.*.translation list.verses.*.notes', function(newValue, oldValue, keypath) {
		if (prevent_update)
			return;

		// Don't bother if nothing has changed (or we're dealing with undefined vars)
		if (JSON.stringify(newValue)!=JSON.stringify(oldValue) && typeof newValue !== "undefined")
		{
			if (!!oldValue)
				updateUserData(keypath, newValue);
		}
	});

	ractive_user = new Ractive({
		el: "#userNav",
		template: "#userDetails",
		data: {
			user: false,
			reference: reference_object
		}
	});
	ractive_user.observe('reference.selection', function(newValue, oldValue, keypath) {
		prevent_update = true;
		if (typeof newValue !== "undefined")
		{
			userOptions.selection = newValue;
			reference_string = newValue.book.toLowerCase().replace(/\s+/g, '') + "_" + pad(newValue.chapter, 3);
			if (user_id)
			{
				loadData();
				if (!just_set_userOptions)
					firebase.database().ref('users/' + user_id + "/options").update(userOptions);
				else
					just_set_userOptions = false;
			}
		}
	});


	// Hide Header on on scroll down
	var didScroll;
	var lastScrollTop = 0;
	var delta = 5;
	var navbarHeight = $('header').outerHeight();

	$(window).scroll(function(event){
		didScroll = true;
	});

	setInterval(function() {
		if (didScroll) {
			hasScrolled();
			didScroll = false;
		}
	}, 250);

	function hasScrolled() {
		var st = $(this).scrollTop();

		// Make sure they scroll more than delta
		if(Math.abs(lastScrollTop - st) <= delta)
			return;

		// If they scrolled down and are past the navbar, add class .nav-up.
		// This is necessary so you never see what is "behind" the navbar.
		if (st > lastScrollTop && st > navbarHeight){
			// Scroll Down
			$('header').removeClass('nav-down').addClass('nav-up');
		} else {
			// Scroll Up
			if(st + $(window).height() < $(document).height()) {
				$('header').removeClass('nav-up').addClass('nav-down');
			}
		}

		lastScrollTop = st;
	}





	firebase.auth().onAuthStateChanged(function(user) {
		if (user) {
			user_id = user.uid;
			ractive_user.set("user", user);
			firebase.database().ref('/users/' + user_id + "/options").once('value', function(snapshot) {
				var data = snapshot.val();
				userOptions = data !== null ? data : userOptions;

				just_set_userOptions = true;
				ractive_user.set("reference.selection", userOptions.selection);
			});
		}
		else
		{
			user_id = null;
			ractive_user.set("user", false);
			ractive_translation.set("list", {});
		}
	});
}).on("keyup mousedown", "html", function(){
	no_keys_pushed_yet = false;
});
