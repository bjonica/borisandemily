var Koa = require("koa");
var handlebars = require("koa-handlebars");
var router = require("koa-router")();
var koaStatic = require("koa-static");
var monk = require('monk');
var wrap = require('co-monk');
var db = monk('localhost/test');
var bodyParser = require('koa-bodyparser');
var nodemailer = require('nodemailer');
var app = Koa();

var parties = wrap(db.get('parties'));

var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

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

router.get('/', function* (next) {
    this.redirect('/rsvp');
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
        party.greeting = body.greeting;
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
        this.redirect('/admin/');
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
            subTitle: "May 31, 2015",
            selectedRsvp: true
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
                notFound: true,
                selectedRsvp: true
            })
        } else {
            yield this.render("rsvp", {
                coverHeading: this.party.greeting,
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
                success: this.success,
                selectedRsvp: true
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

router.get('/contact', function* (next) {
    yield this.render('contact', {
        coverHeading: 'Contact Us',
        title: "Boris & Emily",
        subTitle: "May 31, 2015",
        selectedContact: true
    });
    yield next;
});

router.post('/contact',
    function* (next) {
        var body = this.request.body;
        if (body.senderName == null ||
            body.senderName === '' ||
            body.senderEmail == null ||
            body.senderEmail === '' ||
            body.message == null ||
            body.message === '') {
            this.status = 503;
            return yield this.render('contact', {
                coverHeading: 'Contact Us',
                issue: 'There was an error with the form. Make sure all fields are filled out',
                title: "Boris & Emily",
                subTitle: "May 31, 2015",
                selectedContact: true
            });
        }
        yield next;
    },
    function* (next) {
        var mailOptions = {
            from: this.request.body.senderName + ' <' + this.request.body.senderEmail + '>',
            to: process.env.GMAIL_USER,
            subject: 'BorisAndEmily: Message from ' + this.request.body.senderName,
            text: "Sender: " + this.request.body.senderEmail + "\n\nMessage:\n" + this.request.body.message
        };
        var that = this;
        transporter.sendMail(mailOptions, function(error, info) {
            if(error) {
                console.log(error);
                that.status = 503;
            } else {
                console.log('Message sent: ' + info.response);
            }
        });
        yield next;
    },
    function* (next) {
        if (this.status != 503) {
            yield this.render('thanks', {
                coverHeading: 'Message Sent!',
                title: "Boris & Emily",
                subTitle: "May 31, 2015"
            });
        } else {
            yield this.render('contact', {
                coverHeading: 'Contact Us',
                issue: "For some reason, the email wouldn't send. Try again?",
                title: "Boris & Emily",
                subTitle: "May 31, 2015",
                selectedContact: true
            });
        }
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