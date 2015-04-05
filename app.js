var Koa = require("koa");
var handlebars = require("koa-handlebars");
var router = require("koa-router")();
var koaStatic = require("koa-static");
var monk = require('monk');
var wrap = require('co-monk');
var db = monk('localhost/test');
var bodyParser = require('koa-bodyparser');
var app = Koa();

var parties = wrap(db.get('parties'));

app.use(handlebars({
    defaultLayout: "main",
    cache: true
}));

app.use(bodyParser());

app.use(function* (next) {
    if (this.status == 404) {
        yield this.render("404", {
            title: "Boris & Emily",
            subTitle: "May 31, 2015"
        });
    }
    yield next;
});

router.get('/admin', function* (next) {
    if (this.request.query.rsvpId) {
        return this.redirect('/admin/' + this.query.rsvpId);
    }
    yield this.render("admin", {
        coverHeading: "RSVP Admin",
        title: "Boris & Emily",
        subTitle: "May 31, 2015"
    });
    yield next;
});

router.get('/admin/:id',
    function* (next) {
        this.party = yield parties.findOne({ rsvpId: parseInt(this.params.id) });
        console.log(this.party);
        this.success = this.request.query.success;
        yield next;
    },
    function* (next) {
        if (this.party == null) {
            yield this.render("admin", {
                coverHeading: "RSVP Admin",
                title: "Boris & Emily",
                subTitle: "May 31, 2015",
                rsvpId: this.params.id,
                notFound: true
            })
        } else {
            var firstGuest = null;
            if (this.party.partyMembers.length > 0) {
                firstGuest = this.party.partyMembers[0];
            }
            var otherGuests = [];
            if (this.party.partyMembers.length > 1) {
                otherGuests.push.apply(otherGuests, this.party.partyMembers.slice(1, this.party.partyMembers.length))
            }
            yield this.render("admin", {
                coverHeading: "RSVP Admin",
                title: "Boris & Emily",
                subTitle: "May 31, 2015",
                found: true,
                rsvped: this.party.rsvped,
                rsvpId: this.party.rsvpId,
                isAttending: this.party.attending === 'yes',
                isNotAttending: this.party.attending === 'no',
                isMaybeAttending: this.party.attending === 'maybe',
                firstGuest: firstGuest,
                otherGuests: otherGuests,
                email: this.party.email,
                specialRequests: this.party.requests,
                partyMembers: this.party.partyMembers,
                success: this.success
            })
        }
    }
);

router.post('/admin/:id',
    function* (next) {
        console.log(this.request.body);
        var body = this.request.body;
        var party = yield parties.findOne({ rsvpId: parseInt(this.params.id) });
        if (body.delete && party.rsvpId === parseInt(body.delete)) {
            console.log("maybe deleting");
            yield parties.remove(party);
            this.redirect('/admin/' + this.params.id);
        }
        if (party == null) {
            party = {
                rsvpId: parseInt(this.params.id),
                email: null,
                attending: null,
                rsvped: null,
                requests: null,
                partyMembers: []
            }
        }
        var rsvped = false;
        var guests = body.guests;
        if (guests == null) {
            guests = []
        }
        var newPartyMembersArray = [];
        guests.forEach(function(e, i, a) {
            if (e !== "") {
                var guestAttending = true;
                var pIndex = party.partyMembers.map(function(x) { return x.name; }).indexOf(e);
                if (pIndex != -1) {
                    guestAttending = party.partyMembers[pIndex].attending;
                }
                newPartyMembersArray.push({name: e, attending: guestAttending})
            }
        });
        party.partyMembers = newPartyMembersArray;
        if (body.attending != null && body.attending !== '') {
            rsvped = true;
            party.attending = body.attending;
        } else if (body.attending === '') {
            party.attending = null;
        }
        party.email = body.email;
        party.rsvped = rsvped;
        if (body.specialRequests != null) {
            party.requests = body.specialRequests;
        }
        if (party._id) {
            yield parties.updateById(party._id, party);
        } else {
            console.log(party);
            yield parties.insert(party);
        }
        yield next;
    },
    function* (next) {
        this.redirect('/admin/' + this.params.id);
        yield next;
    }
);

router.get('/rsvp', function* (next) {
    if (this.request.query && this.request.query.rsvpId) {
        this.redirect('/rsvp/' + this.request.query.rsvpId);
    } else {
        yield this.render("rsvp", {
            coverHeading: "RSVP",
            title: "Boris & Emily",
            subTitle: "May 31, 2015"
        });
    }
    yield next;
});

router.get('/rsvp/:id',
    function* (next) {
        this.party = yield parties.findOne({ rsvpId: parseInt(this.params.id) });
        this.success = this.request.query.success;
        yield next;
    },
    function* (next) {
        if (this.party == null) {
            yield this.render("rsvp", {
                coverHeading: "RSVP",
                title: "Boris & Emily",
                subTitle: "May 31, 2015",
                notFound: true
            })
        } else {
            yield this.render("rsvp", {
                coverHeading: "RSVP",
                title: "Boris & Emily",
                subTitle: "May 31, 2015",
                found: true,
                rsvped: this.party.rsvped,
                rsvpId: this.party.rsvpId,
                isAttending: this.party.attending === 'yes',
                isNotAttending: this.party.attending === 'no',
                isMaybeAttending: this.party.attending === 'maybe',
                email: this.party.email,
                specialRequests: this.party.requests,
                partyMembers: this.party.partyMembers,
                success: this.success
            })
        }
        console.log(this.party);
        yield next;
    }
);

router.post('/rsvp/:id',
    function* (next) {
        var body = this.request.body;
        var party = yield parties.findOne({ rsvpId: parseInt(this.params.id) });
        var rsvped = false;
        var partyMembers = body.partyAttendees;
        if (typeof(partyMembers) !== 'undefined') {
            party.partyMembers.forEach(function (e, i, a) {
                e.attending = partyMembers.indexOf(e.name) != -1;
            });
        } else {
            party.partyMembers.forEach(function (e, i, a) {
                e.attending = false;
            });
        }
        if (body.attending) { rsvped = true }
        party.email = body.email;
        party.attending = body.attending;
        party.rsvped = rsvped;
        party.requests = body.specialRequests;
        parties.updateById(party._id, party);
        //this.success = true;
        yield next;
    },
    function* (next) {
        this.redirect('/rsvp/' + this.params.id + '?success=true');
        yield next;
    }
);

app.use(koaStatic(__dirname + '/bower_components/bootstrap/dist'));
app.use(koaStatic(__dirname + '/bower_components/jquery/dist'));
app.use(koaStatic(__dirname + '/layouts/static', {
  maxAge: 60 * 60 * 24 * 365
}));


app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000);