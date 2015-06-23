/* ***** BEGIN LICENSE BLOCK *****
 *
 * "The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 *
 * The Original Code is Zindus Sync.
 *
 * The Initial Developer of the Original Code is Toolware Pty Ltd.
 *
 * Portions created by Initial Developer are Copyright (C) 2007-2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): Leni Mayo
 *
 * ***** END LICENSE BLOCK *****/

// A skeleton for ldap sync
// 

function SyncFsmLd(id_fsm)     { SyncFsm.call(this);   }
SyncFsmLd.prototype     = new SyncFsm();

SyncFsm.newSyncFsm.a_map = SyncFsm.newSyncFsm.a_map || new Object();
SyncFsm.newSyncFsm.a_map["twoway"   + FORMAT_LD] = { id_fsm: Maestro.FSM_ID_LD_TWOWAY,   syncfsm: function() { return new SyncFsmLd(); } };
SyncFsm.newSyncFsm.a_map["authonly" + FORMAT_LD] = { id_fsm: Maestro.FSM_ID_LD_AUTHONLY, syncfsm: function() { return new SyncFsmLd(); } };

SyncFsmLd.prototype.initialiseFsm = function()
{
	var transitions = {
		start:             { evCancel: 'final', evNext: 'stAuthSelect',                                     evLackIntegrity: 'final'     },
		stAuthSelect:      { evCancel: 'final', evNext: 'stAuthLogin',                                      evLackIntegrity: 'final'     },
		stAuthLogin:       { evCancel: 'final', evNext: 'final',            evHttpRequest: 'stHttpRequest'                               },
		stAuthCheck:       { evCancel: 'final', evNext: 'final',                                            evLackIntegrity: 'final'     },

		// FIXME serge:
		// - once ldap auth is working, you will change the 'evNext' state from 'final' above to stLoad etc
		//
		stLoad:            { evCancel: 'final', evNext: 'stLoadTb',         evRepeat:      'stLoad',          evLackIntegrity: 'final'   },
		stLoadTb:          { evCancel: 'final', evNext: 'stConverge',       evRepeat:      'stLoadTb',        evLackIntegrity: 'final'   },
		stConverge:        { evCancel: 'final', evNext: 'stUpdateTb',       evRepeat:      'stConverge',      evLackIntegrity: 'final'   },
		stUpdateTb:        { evCancel: 'final', evNext: 'stUpdateCleanup',  evRepeat:      'stUpdateTb',      evLackIntegrity: 'final'   },
		stUpdateCleanup:   { evCancel: 'final', evNext: 'stCommit',         evRepeat:      'stUpdateCleanup', evLackIntegrity: 'final'   },
		stCommit:          { evCancel: 'final', evNext: 'final'                                                                          },

		stHttpRequest:     { evCancel: 'final', evNext: 'stHttpResponse'                                                                 },
		stHttpResponse:    { evCancel: 'final', evNext: 'final' /* evNext here is set by setupHttp */                                    },

		final:             { }
	};

	var a_entry = {
		start:                  this.entryActionStart,
		stAuthSelect:           this.entryActionAuthSelect,
		stAuthLogin:            this.entryActionAuthLogin,
		stAuthCheck:            this.entryActionAuthCheck,
		stLoad:                 this.entryActionLoad,
		stLoadTb:               this.entryActionLoadTb,
		stConverge:             this.entryActionConverge,
		stUpdateTb:             this.entryActionUpdateTb,
		stUpdateCleanup:        this.entryActionUpdateCleanup,
		stCommit:               this.entryActionCommit,

		stHttpRequest:          this.entryActionHttpRequest,
		stHttpResponse:         this.entryActionHttpResponse,

		final:                  this.entryActionFinal
	};

	var a_exit = {
		stAuthLogin:            this.exitActionAuthLogin,
		stHttpResponse:         this.exitActionHttpResponse  /* this gets tweaked by setupHttpZm */
	};

	this.fsm = new Fsm(transitions, a_entry, a_exit);
}

SyncFsmLd.prototype.initialiseState = function(id_fsm, is_attended, sourceid, sfcd)
{
	SyncFsm.prototype.initialiseState.call(this, id_fsm, is_attended, sourceid, sfcd);

	var state = this.state;

	// serge FIXME:
	// - state that is carried across the life of an ldap sync is initialised here

	state.initialiseSource(sourceid, FORMAT_LD);
}

// Validate the account information supplied by the user
//
SyncFsmLd.prototype.entryActionAuthSelect = function(state, event, continuation)
{
	var nextEvent = null;

	this.state.stopwatch.mark(state);

	// serge FIXME: 
	// - don't always need username + password to connect to an ldap server...
	// - will need an equivalent of isValidUrl to test connectivity to the ldap server
	//
	var sourceid_pr = this.state.sourceid_pr;
	var url         = this.account().url;
	var username    = this.account().username;
	var password    = this.account().passwordlocator.getPassword();

	if (url && /^ldaps?:\/\//.test(url)) // && username.length > 0 && password && password.length > 0 && isValidUrl(url))
	{
		nextEvent = 'evNext';
	}
	else
	{
		this.state.stopFailCode = 'failon.integrity.zm.bad.credentials';
		nextEvent = 'evLackIntegrity';
	}

	continuation(nextEvent);
}

// Authenticate to the ldap server (if necessary)
//
SyncFsmLd.prototype.entryActionAuthLogin = function(state, event, continuation)
{
	this.state.stopwatch.mark(state);

	var sourceid_pr = this.state.sourceid_pr;

	let dlg = UserPrompt.show("ldap authentication goes here", {'buttons' : "accept"});

	// FIXME serge:
	// - you will need to create an equivalent to setupHttpGd and setupHttpZm to support communication with an ldap server
	// - setupHttpGd and setupHttpZm use XMLHttpRequest. I don't know what the mozilla javascript library is for talking ldap,
	//   or even whether there is one (!)
	//
	// this.setupLdap(state, 'evNext', ...);
	// continuation('evHttpRequest');

	continuation('evNext');
}

// process the response to the authenticate request
//
SyncFsmLd.prototype.exitActionAuthLogin = function(state, event)
{
	if (!this.state.m_http || !this.state.m_http.response() || event == "evCancel")
		return;

	var response = this.state.m_http.response();

	if (response)
	{
		// this is for zimbra - need something similar for ldap?
		// conditionalGetElementByTagNameNS(response, Xpath.NS_ZACCOUNT, "authToken", this.state, 'authToken');
	}
}
