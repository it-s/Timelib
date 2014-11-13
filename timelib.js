// Utility functions for date and time programming.
// JavaScript by Peter Hayes
// http://www.aphayes.pwp.blueyonder.co.uk/
// Copyright 2001-2010
// This code is made freely available but please keep this notice.
// I accept no liability for any errors in my coding but please
// let me know of any errors you find. My address is on my home page.

//  Javascript 1.2 includes getFullYear but Netscape 4.6 does not supply it.

//Math extentions
Math.rev = function (angle) {
    return angle - Math.floor(angle / 360.0) * 360.0;
}
Math.sind = function (angle) {
    return Math.sin((angle * Math.PI) / 180.0);
}
Math.cosd = function (angle) {
    return Math.cos((angle * Math.PI) / 180.0);
}
Math.tand = function (angle) {
    return Math.tan((angle * Math.PI) / 180.0);
}
Math.asind = function (c) {
    return (180.0 / Math.PI) * Math.asin(c);
}
Math.acosd = function (c) {
    return (180.0 / Math.PI) * Math.acos(c);
}
Math.atan2d = function (y, x) {
    return (180.0 / Math.PI) * Math.atan(y / x) - 180.0 * (x < 0);
}

//Date extentions
Date.prototype.getDayNumber = function (_hours) {
    // Day number is a modified Julian date, day 0 is 2000 January 0.0
    // which corresponds to a Julian date of 2451543.5
    var year = this.getFullYear(),
        month = this.getMonth() + 1, //ccount for JS starting month count from 0
        day = this.getDate(),
        hours = _hours || this.getHours();
    var d = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4) + Math.floor((275 * month) / 9) + day - 730530 + hours / 24;
    return d;
}

Date.prototype.getJulianDayNumber = function () {
    return this.getDayNumber() + 2451543.5;
}

Date.prototype.getLocalSidereal = function (_hours, _lon) {
    // Compute local siderial time in degrees
    // year, month, day and hours are the Greenwich date and time
    // lon is the observers longitude
    var year = this.getFullYear(),
        month = this.getMonth(),
        day = this.getDate(),
        hours = _hours || this.getHours(),
        lon = _lon || this.getLon();
    var d = this.getDayNumber(hours);
    var lst = (98.9818 + 0.985647352 * d + hours * 15 + lon);
    return Math.rev(lst) / 15;
}

Date.prototype.getTimezoneOffsetGMT = function () {
    var TZ = this.getTimezoneOffset();
    return ((TZ > 0) ? -1 : 1) * TZ / 60;
}

Date.prototype.setLat = function (lat) {
    this.lat = lat;
}
Date.prototype.getLat = function () {
    return this.lat || 0.0;
}
Date.prototype.setLon = function (lon) {
    this.lon = lon;
}
Date.prototype.getLon = function () {
    return this.lon || 0.0;
}

Date.prototype.setPosition = function (lat, lon) {
    this.setLat(lat);
    this.setLon(lon);
}

//Sun calculations

Date.prototype.getSunTimes = function () {
    // Based on method in sci.astro FAQ by Paul Schlyter
    // returns an array holding rise and set times in UTC hours
    // NOT accurate at high latitudes 
    // latitude = your local latitude: north positive, south negative
    // longitude = your local longitude: east positive, west negative
    // Calculate the Suns position at noon local zone time
    var d = this.getDayNumber(12.0 - this.getLon() / 15);
    var oblecl = 23.4393 - 3.563E-7 * d;
    var w = 282.9404 + 4.70935E-5 * d;
    var M = 356.0470 + 0.9856002585 * d;
    var e = 0.016709 - 1.151E-9 * d;
    var E = M + e * (180 / Math.PI) * Math.sind(M) * (1.0 + e * Math.cosd(M));
    var A = Math.cosd(E) - e;
    var B = Math.sqrt(1 - e * e) * Math.sind(E);
    var slon = w + Math.atan2d(B, A);
    var sRA = Math.atan2d(Math.sind(slon) * Math.cosd(oblecl), Math.cosd(slon));
    while (sRA < 0) sRA += 360;
    while (sRA > 360) sRA -= 360;
    sRA = sRA / 15;
    var sDec = Math.asind(Math.sind(oblecl) * Math.sind(slon));
    // Time sun is on the meridian
    var lst = this.getLocalSidereal(12 - this.getLon() / 15, this.getLon());
    var MT = 12.0 - this.getLon() / 15 + sRA - lst;
    while (MT < 0) MT += 24;
    while (MT > 24) MT -= 24;
    // hour angle
    var cHA0 = (Math.sind(-0.833) - Math.sind(this.getLat()) * Math.sind(sDec)) / (Math.cosd(this.getLat()) * Math.cosd(sDec));
    var HA0 = Math.acosd(cHA0);
    HA0 = Math.rev(HA0) / 15;
    return {
        "meridianTime": MT,
        "hourAngle": HA0
    };
}

Date.prototype.getSunrize = function () {
    var sunTime = this.getSunTimes();
    return sunTime.meridianTime - sunTime.hourAngle + this.getTimezoneOffsetGMT();
}

Date.prototype.getSunset = function () {
    var sunTime = this.getSunTimes();
    return sunTime.meridianTime + sunTime.hourAngle + this.getTimezoneOffsetGMT();
}

Date.prototype.getLightTimeDuration = function () {
    return this.getSunset() - this.getSunrize ();
}

Date.prototype.getDarkTimeDuration = function () {
    var d = new Date();
    //Go into the next day to get sunrize hour
    d.setDate(this.getDate()+1);
    d.setLat(this.getLat());
    d.setLon(this.getLon());    
    return (24 + d.getSunrize()) - this.getSunset();
}

Date.prototype.isLightTime = function () {
    var tt = Convert.timeToHours(this);
    return ( this.getSunrize() <= tt && tt < this.getSunset() );
}

Date.prototype.isDarkTime = function () {
    return !this.isDaytime();
}

Date.prototype.getSunHourLength = function () {
    var duration = this.isLightTime()? this.getLightTimeDuration(): this.getDarkTimeDuration();
    return duration / 12;
}

Date.prototype.getSunHour = function () {
    var hour = Convert.timeToHours(this),
        sunrise = this.getSunrize(),
        sunset;
//    var hour = tt + (tt < sunrise)? 24 : 0;
    if(this.isLightTime())
        return (hour - sunrise) / this.getSunHourLength() + 12;
    else
        if (hour < sunrise){
            hour += 24;
            var pd = new Date();
                pd.setDate(this.getDate() - 1);
                pd.setPosition(this.getLat(), this.getLon());
            sunset =  pd.getSunset();
        }else sunset =  this.getSunset()
        return (hour - sunset) / this.getSunHourLength();
}

Date.prototype.getSunDay = function () {
    //Sun week starts on Saturday!, which is Friday sundown;
    var sunset = this.getSunset(),
        hour = Convert.timeToHours(this),
        weekDay = this.getDay();
    weekDay = hour >= sunset ?
        (weekDay + 1 > 6? 0 : weekDay + 1): weekDay;
    weekDay = (weekDay + 1 > 6)? 0 : weekDay + 1;
    return weekDay;
}

//Moon Calculations

Date.Meeus = {
    "LON": {
        "T45AD": [0, 2, 2, 0, 0, 0, 2, 2, 2, 2,
                    0, 1, 0, 2, 0, 0, 4, 0, 4, 2,
                    2, 1, 1, 2, 2, 4, 2, 0, 2, 2,
                    1, 2, 0, 0, 2, 2, 2, 4, 0, 3,
                    2, 4, 0, 2, 2, 2, 4, 0, 4, 1,
                    2, 0, 1, 3, 4, 2, 0, 1, 2, 2],
        "T45AM": [0, 0, 0, 0, 1, 0, 0, -1, 0, -1,
                    1, 0, 1, 0, 0, 0, 0, 0, 0, 1,
                    1, 0, 1, -1, 0, 0, 0, 1, 0, -1,
                    0, -2, 1, 2, -2, 0, 0, -1, 0, 0,
                    1, -1, 2, 2, 1, -1, 0, 0, -1, 0,
                    1, 0, 1, 0, 0, -1, 2, 1, 0, 0],
        "T45AMP": [1, -1, 0, 2, 0, 0, -2, -1, 1, 0,
                    -1, 0, 1, 0, 1, 1, -1, 3, -2, -1,
                    0, -1, 0, 1, 2, 0, -3, -2, -1, -2,
                    1, 0, 2, 0, -1, 1, 0, -1, 2, -1,
                    1, -2, -1, -1, -2, 0, 1, 4, 0, -2,
                    0, 2, 1, -2, -3, 2, 1, -1, 3, -1],
        "T45AF": [0, 0, 0, 0, 0, 2, 0, 0, 0, 0,
                    0, 0, 0, -2, 2, -2, 0, 0, 0, 0,
                    0, 0, 0, 0, 0, 0, 0, 0, 2, 0,
                    0, 0, 0, 0, 0, -2, 2, 0, 2, 0,
                    0, 0, 0, 0, 0, -2, 0, 0, 0, 0,
                    -2, -2, 0, 0, 0, 0, 0, 0, 0, -2],
        "T45AL": [6288774, 1274027, 658314, 213618, -185116, -114332, 58793, 57066, 53322, 45758,
                  -40923, -34720, -30383, 15327, -12528, 10980, 10675, 10034, 8548, -7888,
                  -6766, -5163, 4987, 4036, 3994, 3861, 3665, -2689, -2602, 2390,
                  -2348, 2236, -2120, -2069, 2048, -1773, -1595, 1215, -1110, -892,
                  -810, 759, -713, -700, 691, 596, 549, 537, 520, -487,
                  -399, -381, 351, -340, 330, 327, -323, 299, 294, 0],
        "T45AR": [-20905355, -3699111, -2955968, -569925, 48888, -3149, 246158, -152138, -170733, -204586,
                  -129620, 108743, 104755, 10321, 0, 79661, -34782, -23210, -21636, 24208,
                  30824, -8379, -16675, -12831, -10445, -11650, 14403, -7003, 0, 10056,
                  6322, -9884, 5751, 0, -4950, 4130, 0, -3958, 0, 3258,
                  2616, -1897, -2117, 2354, 0, 0, -1423, -1117, -1571, -1739,
                  0, -4421, 0, 0, 0, 0, 1165, 0, 0, 875]
    },
    "LAT": {
        "T45BD": [0, 0, 0, 2, 2, 2, 2, 0, 2, 0,
                    2, 2, 2, 2, 2, 2, 2, 0, 4, 0,
                    0, 0, 1, 0, 0, 0, 1, 0, 4, 4,
                    0, 4, 2, 2, 2, 2, 0, 2, 2, 2,
                    2, 4, 2, 2, 0, 2, 1, 1, 0, 2,
                    1, 2, 0, 4, 4, 1, 4, 1, 4, 2],
        "T45BM": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                    -1, 0, 0, 1, -1, -1, -1, 1, 0, 1,
                    0, 1, 0, 1, 1, 1, 0, 0, 0, 0,
                    0, 0, 0, 0, -1, 0, 0, 0, 0, 1,
                    1, 0, -1, -2, 0, 1, 1, 1, 1, 1,
                    0, -1, 1, 0, -1, 0, 0, 0, -1, -2],
        "T45BMP": [0, 1, 1, 0, -1, -1, 0, 2, 1, 2,
                    0, -2, 1, 0, -1, 0, -1, -1, -1, 0,
                    0, -1, 0, 1, 1, 0, 0, 3, 0, -1,
                    1, -2, 0, 2, 1, -2, 3, 2, -3, -1,
                    0, 0, 1, 0, 1, 1, 0, 0, -2, -1,
                    1, -2, 2, -2, -1, 1, 1, -1, 0, 0],
        "T45BF": [1, 1, -1, -1, 1, -1, 1, 1, -1, -1,
                 -1, -1, 1, -1, 1, 1, -1, -1, -1, 1,
                 3, 1, 1, 1, -1, -1, -1, 1, -1, 1,
                 -3, 1, -3, -1, -1, 1, -1, 1, -1, 1,
                 1, 1, 1, -1, 3, -1, -1, 1, -1, -1,
                 1, -1, 1, -1, -1, -1, -1, -1, -1, 1],
        "T45BL": [5128122, 280602, 277693, 173237, 55413, 46271, 32573, 17198, 9266, 8822,
                8216, 4324, 4200, -3359, 2463, 2211, 2065, -1870, 1828, -1794,
                -1749, -1565, -1491, -1475, -1410, -1344, -1335, 1107, 1021, 833,
                 777, 671, 607, 596, 491, -451, 439, 422, 421, -366, -351, 331, 315,
                 302, -283, -229, 223, 223, -220, -220, -185, 181, -177, 176, 166, -164, 132, -119, 115, 107]
    }
};

Date.prototype.getMoonPosition = function(_hours) {
    // julian date
    var jd = this.getJulianDayNumber();
    var T = (jd - 2451545.0) / 36525;
    var T2 = T * T;
    var T3 = T2 * T;
    var T4 = T3 * T;
    // Moons mean longitude L'
    var LP = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841.0 - T4 / 65194000.0;
    // Moons mean elongation
    var D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868.0 - T4 / 113065000.0;
    // Suns mean anomaly
    var M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000.0;
    // Moons mean anomaly M'
    var MP = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699.0 - T4 / 14712000.0;
    // Moons argument of latitude
    var F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000.0 + T4 / 863310000.0;

    // Additional arguments
    var A1 = 119.75 + 131.849 * T;
    var A2 = 53.09 + 479264.290 * T;
    var A3 = 313.45 + 481266.484 * T;
    var E = 1 - 0.002516 * T - 0.0000074 * T2;
    var E2 = E * E;
    // Sums of periodic terms from table 45.A and 45.B
    var Sl = 0.0;
    var Sr = 0.0;
    for (var i = 0; i < 60; i++) {
        var Eterm = 1;
        if (Math.abs(Date.Meeus.LON.T45AM[i]) == 1) Eterm = E;
        if (Math.abs(Date.Meeus.LON.T45AM[i]) == 2) Eterm = E2;
        Sl += Date.Meeus.LON.T45AL[i] * Eterm * Math.sind(Math.rev(Date.Meeus.LON.T45AD[i] * D + Date.Meeus.LON.T45AM[i] * M + Date.Meeus.LON.T45AMP[i] * MP + Date.Meeus.LON.T45AF[i] * F));
        Sr += Date.Meeus.LON.T45AR[i] * Eterm * Math.cosd(Math.rev(Date.Meeus.LON.T45AD[i] * D + Date.Meeus.LON.T45AM[i] * M + Date.Meeus.LON.T45AMP[i] * MP + Date.Meeus.LON.T45AF[i] * F));
    }
    var Sb = 0.0;
    for (var i = 0; i < 60; i++) {
        var Eterm = 1;
        if (Math.abs(Date.Meeus.LAT.T45BM[i]) == 1) Eterm = E;
        if (Math.abs(Date.Meeus.LAT.T45BM[i]) == 2) Eterm = E2;
        Sb += Date.Meeus.LAT.T45BL[i] * Eterm * Math.sind(Math.rev(Date.Meeus.LAT.T45BD[i] * D + Date.Meeus.LAT.T45BM[i] * M + Date.Meeus.LAT.T45BMP[i] * MP + Date.Meeus.LAT.T45BF[i] * F));
    }
    // Additional additive terms
    Sl = Sl + 3958 * Math.sind(Math.rev(A1)) + 1962 * Math.sind(Math.rev(LP - F)) + 318 * Math.sind(Math.rev(A2));
    Sb = Sb - 2235 * Math.sind(Math.rev(LP)) + 382 * Math.sind(Math.rev(A3)) + 175 * Math.sind(Math.rev(A1 - F)) +
        175 * Math.sind(Math.rev(A1 + F)) + 127 * Math.sind(Math.rev(LP - MP)) - 115 * Math.sind(Math.rev(LP + MP));
    // geocentric longitude, latitude and distance
    var mglong = Math.rev(LP + Sl / 1000000.0);
    var mglat = Math.rev(Sb / 1000000.0);
    if (mglat > 180.0) mglat = mglat - 360;
    var mr = Math.round(385000.56 + Sr / 1000.0);
    // Obliquity of Ecliptic
    var obl = 23.4393 - 3.563E-9 * (jd - 2451543.5);
    // RA and dec
    var ra = Math.rev(Math.atan2d(Math.sind(mglong) * Math.cosd(obl) - Math.tand(mglat) * Math.sind(obl),
        Math.cosd(mglong))) / 15.0;
    var dec = Math.rev(Math.asind(Math.sind(mglat) * Math.cosd(obl) + Math.cosd(mglat) * Math.sind(obl) * Math.sind(mglong)));
    if (dec > 180.0) dec = dec - 360;
    //Right ascension, declination, 
    return {
        "rightAscension": ra,
        "declination": dec,
        "meanRadiusVector": mr
    }
    //new Array(ra, dec, mr);
}

//Date.prototype.getMoonTimes = function() {
//    // returns an array containing rise and set times or one of the
//    // following codes.
//    // -1 rise or set event not found and moon was down at 00:00
//    // -2 rise or set event not found and moon was up   at 00:00
//    // WARNING code changes on 6/7 May 2003 these are now local times
//    // NOT UTC and rise/set not found codes changed.
//    var hours = 0;
//    var riseset = new Array();
//    // elh is the elevation at the hour elhdone is true if elh calculated
//    var elh = new Array();
//    var elhdone = new Array();
//    for (var i = 0; i <= 24; i++) {
//        elhdone[i] = false;
//    }
//    // Compute the moon elevation at start and end of day
//    // store elevation at the hours in an array elh to save search time
//    var dd = new Date();
//        dd.setDate(this.getDate());
//        dd.setPosition(this.getLat(),this.getLon());
//        dd.setHours(this.get.hours() - this.getTimezoneOffsetGMT());
//    var rad = dd.getMoonPosition();
//    var altaz = Convert.rightAscensionToAltitudeAzimuth(rad.rightAscension,rad.declination,dd);
//    elh[0] = altaz[0];
//    elhdone[0] = true;
//    // set the return code to allow for always up or never rises
//    if (elh[0] > 0.0) {
//        riseset = new Array(-2, -2);
//    } else {
//        riseset = new Array(-1, -1);
//    }
//    hours = 24;
//    rad = dd.getMoonPosition();
//    altaz = Convert.rightAscensionToAltitudeAzimuth(rad.rightAscension,rad.declination,dd);
//    elh[24] = altaz[0];
//    elhdone[24] = true;
//    // search for moonrise and set
//    for (var rise = 0; rise < 2; rise++) {
//        var found = false;
//        var hfirst = 0;
//        var hlast = 24;
//        // Try a binary chop on the hours to speed the search
//        while (Math.ceil((hlast - hfirst) / 2) > 1) {
//            hmid = hfirst + Math.round((hlast - hfirst) / 2);
//            if (!elhdone[hmid]) {
//                hours = hmid;
//                rad = MoonPos(year, month, day, hours - TZ);
//                altaz = radtoaa(rad[0], rad[1], year, month, day, hours - TZ, latitude, longitude);
//                elh[hmid] = altaz[0];
//                elhdone[hmid] = true;
//            }
//            if (((rise == 0) && (elh[hfirst] <= 0.0) && (elh[hmid] >= 0.0)) ||
//                ((rise == 1) && (elh[hfirst] >= 0.0) && (elh[hmid] <= 0.0))) {
//                hlast = hmid;
//                found = true;
//                continue;
//            }
//            if (((rise == 0) && (elh[hmid] <= 0.0) && (elh[hlast] >= 0.0)) ||
//                ((rise == 1) && (elh[hmid] >= 0.0) && (elh[hlast] <= 0.0))) {
//                hfirst = hmid;
//                found = true;
//                continue;
//            }
//            break;
//        }
//        // If the binary chop did not find a 1 hour interval
//        if ((hlast - hfirst) > 1) {
//            for (var i = hfirst; i < hlast; i++) {
//                found = false;
//                if (!elhdone[i + 1]) {
//                    hours = i + 1;
//                    rad = MoonPos(year, month, day, hours - TZ);
//                    altaz = radtoaa(rad[0], rad[1], year, month, day, hours - TZ, latitude, longitude);
//                    elh[hours] = altaz[0];
//                    elhdone[hours] = true;
//                }
//                if (((rise == 0) && (elh[i] <= 0.0) && (elh[i + 1] >= 0.0)) ||
//                    ((rise == 1) && (elh[i] >= 0.0) && (elh[i + 1] <= 0.0))) {
//                    hfirst = i;
//                    hlast = i + 1;
//                    found = true;
//                    break;
//                }
//            }
//        }
//        // simple linear interpolation for the minutes
//        if (found) {
//            var elfirst = elh[hfirst];
//            var ellast = elh[hlast];
//            hours = hfirst + 0.5;
//            rad = MoonPos(year, month, day, hours - TZ);
//            altaz = radtoaa(rad[0], rad[1], year, month, day, hours - TZ, latitude, longitude);
//            // alert("day ="+day+" hour ="+hours+" altaz="+altaz[0]+" "+altaz[1]);
//            if ((rise == 0) && (altaz[0] <= 0.0)) {
//                hfirst = hours;
//                elfirst = altaz[0];
//            }
//            if ((rise == 0) && (altaz[0] > 0.0)) {
//                hlast = hours;
//                ellast = altaz[0];
//            }
//            if ((rise == 1) && (altaz[0] <= 0.0)) {
//                hlast = hours;
//                ellast = altaz[0];
//            }
//            if ((rise == 1) && (altaz[0] > 0.0)) {
//                hfirst = hours;
//                elfirst = altaz[0];
//            }
//            var eld = Math.abs(elfirst) + Math.abs(ellast);
//            riseset[rise] = hfirst + (hlast - hfirst) * Math.abs(elfirst) / eld;
//        }
//    } // End of rise/set loop
//    return (riseset);
//}

Date.prototype.getMoonPhase = function() {
    // the illuminated percentage from Meeus chapter 46
    var T = (this.getJulianDayNumber() - 2451545.0) / 36525;
    var T2 = T * T;
    var T3 = T2 * T;
    var T4 = T3 * T;
    // Moons mean elongation Meeus first edition
    // var D=297.8502042+445267.1115168*T-0.0016300*T2+T3/545868.0-T4/113065000.0;
    // Moons mean elongation Meeus second edition
    var D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868.0 - T4 / 113065000.0;
    // Moons mean anomaly M' Meeus first edition
    // var MP=134.9634114+477198.8676313*T+0.0089970*T2+T3/69699.0-T4/14712000.0;
    // Moons mean anomaly M' Meeus second edition
    var MP = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699.0 - T4 / 14712000.0;
    // Suns mean anomaly
    var M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000.0;
    // phase angle
    var pa = 180.0 - D - 6.289 * Math.sind(MP) + 2.1 * Math.sind(M) - 1.274 * Math.sind(2 * D - MP) - 0.658 * Math.sind(2 * D) - 0.214 * Math.sind(2 * MP) - 0.11 * Math.sind(D);
    return Math.rev(pa);    
}

Date.prototype.getMoonIlluminationRatio = function() {
    return Math.round(100.0*(1.0+Math.cosd(this.getMoonPhase()))/2.0);
}

Date.prototype.isMoonWaxing = function () {
    var dd = new Date();
    dd.setDate(this.getDate() - 1);
    return dd.getMoonIlluminationRatio() < this.getMoonIlluminationRatio();
}

Date.prototype.isMoonWaning = function () {
    return !this.isMoonWaxing();
}

Date.prototype.isMoonFull = function () {
    return this.getMoonIlluminationRatio() > 99;
}

Date.prototype.isMoonNew = function () {
    return this.getMoonIlluminationRatio() < 1;
}

//Zodiak
Date.Zodiac = {
    "Tropical":[[321,420],[421,521],[522,621],[622,722],[723,822],[823,923],[924,1023],[1024,1122],[1123,1221],[1222,1320],[1321,1419],[1420,1520]],
    "Siderial":[[415,515],[516,615],[616,715],[716,815],[816,915],[916,1015],[1016,1115],[1116,1215],[1216,1314],[1315,1414],[1415,1514],[1515,1614]]
}

Date.prototype.getZodiac = function(style) {
    if (style == undefined) return undefined;
    var month = this.getMonth() + 1,
        day = this.getDate(),
        lowBoundry = Date.Zodiac[style][0],
        period = month * 100 + day;
    if (period < lowBoundry) period = (month + 12) * 100 + day;
    for (var i = 0; i < Date.Zodiac[style].length; i++){
        var boundry = Date.Zodiac[style][i];
        if (boundry[0] <= period && period <= boundry[1]) return i;
    }
    return undefined;
}

Date.prototype.getTropicalZodiac = function() {
    return this.getZodiac("Tropical");
}

Date.prototype.getSiderialZodiac = function() {
    return this.getZodiac("Siderial");
}

//Time conversion utilities

var Convert = {
    "jsMonthToMonth": function (d) {
        return d.getMonth() + 1;
    },
    "hoursToMinutes": function (h) {
        return h * 60;
    },
    "minutesToHours": function (m) {
        return m / 60;
    },
    "hoursToTimeObject": function (h, hourLength) {
        base = hourLength || 60.0;
        // takes hours and returns hh:mm
        var hours = h;
        while (hours >= 24) {
            hours -= 24;
        }
        while (hours < 0) {
            hours += 24;
        }
        var minutes = Math.round(base * (hours - Math.floor(hours)));
        hours = Math.floor(hours);
        if (minutes >= base) {
            hours += 1;
            minutes -= base;
        }
        if (hours >= 24) {
            hours -= 24;
        }
        return {
            "hours": hours,
            "minutes": minutes
        }
    },
    "timeToHours": function(time){
        var t = time.hasOwnProperty("hours")? time : {"hours": time.getHours(), "minutes": time.getMinutes()};
        return t.hours + (t.minutes / 60);
    },
    "rightAscensionToAltitudeAzimuth": function(rightAscension, declination, dateObject) {
      // convert ra and dec to altitude and azimuth
      // year, month, day and hours are the Greenwich date and time
      // lat and lon are the observers latitude and longitude
      var lst = dateObject.getLocalSidereal(); //local_sidereal(year,month,day,hours,lon);
      var x = Math.cosd(15.0*(lst-rightAscension))*Math.cosd(declination);
      var y = Math.sind(15.0*(lst-rightAscension))*Math.cosd(declination);
      var z = Math.sind(declination);
      // rotate so z is the local zenith
      var xhor=x*Math.sind(dateObject.getLat())-z*Math.cosd(dateObject.getLat());
      var yhor=y;
      var zhor=x*Math.cosd(dateObject.getLat())+z*Math.sind(dateObject.getLat());
      var azimuth=Math.rev(Math.atan2d(yhor,xhor)+180.0); // so 0 degrees is north
      var altitude=Math.atan2d(zhor,Math.sqrt(xhor*xhor+yhor*yhor));
      return {
          "altitude": altitude,
          "azimuth": azimuth
      }
      //new Array(altitude,azimuth);
    }
}

//Tables and lookups
var Lookup = {
    "lang": "US",
    "US":{
        "MonthName": ["January","February","March","April","May","June","July","August","September","October","November","December"],
        "MonthShortName": ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        "WeekDayName": ["Sunday","Monday","Tuesday","Wednesday","Thurthday","Friday","Saturday"],
        "WeekDayShortName": ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
        "WeekDayPlanet": ["Sun","Moon","Mars","Merqury","Jupiter","Venus","Saturn"],
        //Sun week starts on Saturday!, which is Friday sundown;
        "SunHourPlanetName": ["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon", "Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon"],
        "ZodiacSignName":["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]
    },
    "_correctJSnumeration": function(n,jsNumeration) {
        return n + (!jsNumeration&&jsNumeration!==undefined?1:0);
    },
    "_getFirstLevelValue": function(store, n) {
        return store[n];
    },
    "getMonthName": function(n, jsNumeration) {
        return this._getFirstLevelValue (
            this[this.lang].MonthName,
            this._correctJSnumeration(n, jsNumeration)
        );
    },
    "getMonthShortName": function(n, jsNumeration) {
        return this._getFirstLevelValue (
            this[this.lang].MonthShortName,
            this._correctJSnumeration(n, jsNumeration)
        );
    },
    "getWeekDayName": function(n, jsNumeration) {
        return this._getFirstLevelValue (
            this[this.lang].WeekDayName,
            this._correctJSnumeration(n, jsNumeration)
        );
    },
    "getWeekDayShortName": function(n, jsNumeration) {
        return this._getFirstLevelValue (
            this[this.lang].WeekDayShortName,
            this._correctJSnumeration(n, jsNumeration)
        );
    },
    "getWeekDayPlanet": function(n, jsNumeration) {
        return this._getFirstLevelValue (
            this[this.lang].WeekDayPlanet,
            this._correctJSnumeration(n, jsNumeration)
        );
    },
    "getSunHourPlanetName": function(sunDay, sunHour) {
        return this._getFirstLevelValue (
            this[this.lang].SunHourPlanetName,
            Math.floor(sunDay * 24 + sunHour - 1)
        );
    },
    "getZodiacSignName": function(n) {
        return this._getFirstLevelValue (
            this[this.lang].ZodiacSignName,
            n
        );
    }
}

//********************************************
//Temp utilities