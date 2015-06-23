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

function SyncFsmExitStatus()
{
	this.m_exit_status      = null;
	this.m_fail_code        = null; // one of the Fail* codes
	this.m_fail_arg         = null;
	this.m_fail_trailer     = null;
	this.m_fail_fsmoldstate = null;
	this.m_count_conflicts  = 0;
	this.m_logger           = newLogger("SyncFsmExitStatus");

	this.m_a_valid_code = {
	'failon.service'                       : { 'trailer' : 1, 'arglength': 0 }, // 1.  some sort of service failure
	'failon.fault'                         : { 'trailer' : 1, 'arglength': 0 }, //     recieved a soap fault
	'failon.mismatched.response'           : { 'trailer' : 1, 'arglength': 0 }, //     sent ARequest and rcvd BResponse (expected AResponse)
	'failon.cancel'                        : { 'trailer' : 1, 'arglength': 0 }, //     user cancelled
	'failon.integrity.zm.bad.credentials'  : { 'trailer' : 0, 'arglength': 0 }, //     something dodgy about url, username or password
	'failon.integrity.gd.bad.credentials'  : { 'trailer' : 0, 'arglength': 0 }, //     something dodgy about email address or password
	'failon.integrity.data.store.in'       : { 'trailer' : 1, 'arglength': 0 }, //     something dodgy about the data store that just loaded
	'failon.integrity.data.store.out'      : { 'trailer' : 1, 'arglength': 0 }, //     internal error - we created a data store that's dodgy
	'failon.integrity.data.store.map'      : { 'trailer' : 1, 'arglength': 0 }, //     somehow a card acquired the luid of a folder!
	'failon.unexpected'                    : { 'trailer' : 1, 'arglength': 0 }, //     some sort of integrity failure
	'failon.folder.name.empty'             : { 'trailer' : 0, 'arglength': 0 }, //
	'failon.folder.name.duplicate'         : { 'trailer' : 0, 'arglength': 1 }, //
	'failon.folder.name.reserved'          : { 'trailer' : 0, 'arglength': 1 }, //
	'failon.folder.name.invalid'           : { 'trailer' : 0, 'arglength': 1 }, //
	'failon.folder.must.be.present'        : { 'trailer' : 0, 'arglength': 1 }, //
	'failon.folder.reserved.changed'       : { 'trailer' : 1, 'arglength': 1 }, //
	'failon.folder.name.clash'             : { 'trailer' : 1, 'arglength': 1 }, //     a folder name entered from both tb and zm sides
	'failon.folder.source.update'          : { 'trailer' : 1, 'arglength': 1 }, //     the source update operations can't be applied
	'failon.folder.cant.create.shared'     : { 'trailer' : 0, 'arglength': 2 }, //
	'failon.unable.to.update.server'       : { 'trailer' : 1, 'arglength': 0 }, // 20. couldn't make sense of the http/soap response
	'failon.unable.to.update.thunderbird'  : { 'trailer' : 1, 'arglength': 0 }, //
	'failon.no.xpath'                      : { 'trailer' : 0, 'arglength': 0 }, //
	'failon.no.tbpre'                      : { 'trailer' : 0, 'arglength': 1 }, //
	'failon.no.pab.2'                      : { 'trailer' : 0, 'arglength': 1 }, //
	'failon.multiple.ln'                   : { 'trailer' : 1, 'arglength': 0 }, //
	'failon.gd.conflict.4'                 : { 'trailer' : 0, 'arglength': 0 }, //
	'failon.gd.forbidden'                  : { 'trailer' : 0, 'arglength': 0 }, //
	'failon.gd.get'                        : { 'trailer' : 0, 'arglength': 0 }, //
	'failon.must.clean.ab'                 : { 'trailer' : 1, 'arglength': 1 }, //
	'failon.unauthorized'                  : { 'trailer' : 0, 'arglength': 0 }, // 30. server 401 - did a proxy remove the 'Authorized' hdr?
	'failon.auth'                          : { 'trailer' : 1, 'arglength': 1 }, //     Login attempt failed
	'failon.known.bug'                     : { 'trailer' : 1, 'arglength': 2 }, //     Known bug
	'failon.gd.group.rename'               : { 'trailer' : 0, 'arglength': 1 }, //
	'failon.gd.group.name'                 : { 'trailer' : 0, 'arglength': 3 }, //
	'failon.gd.group.duplicate'            : { 'trailer' : 0, 'arglength': 1 }  //
	};
}

SyncFsmExitStatus.prototype.toString = function()
{
	var ret = "";

	ret += "exit_status: " + this.m_exit_status;

	if (this.m_exit_status)
	{
		ret += " fail_code: "        + this.failcode();
		ret += " fail_arg: "         + (this.m_fail_arg ? ("length: " + this.m_fail_arg.length +": "+ this.m_fail_arg.toString()) : "null");
		ret += " fail_trailer: "     + this.m_fail_trailer;
		ret += " fail_fsmoldstate: " + this.m_fail_fsmoldstate;
	}

	ret += " count_conflicts: " + this.m_count_conflicts;

	return ret;
}

SyncFsmExitStatus.prototype.failCodeStringId = function()
{
	var map = {
		'failon.integrity.data.store.out' : 'failon.integrity.data.store.in',
		'failon.integrity.data.store.map' : 'failon.integrity.data.store.in',
		'failon.fault'                    : 'failon.mismatched.response',
		'': null
	};

	var failcode = this.failcode();

	if (failcode in map)
		failcode = map[failcode];

	var stringid = 'status.' + failcode;

	return stringid;
}

SyncFsmExitStatus.prototype.failcode = function()
{
	if (arguments.length == 1)
	{
		this.m_fail_code = arguments[0];
		zinAssertAndLog(this.m_fail_code in this.m_a_valid_code, this.m_fail_code);
	}

	return this.m_fail_code;
}

SyncFsmExitStatus.prototype.asMessage = function(sbsSuccess, sbsFailure)
{
	var msg = "";

	// if the dialog was cancelled while we were syncing, string bundles wont be available, so we try/catch...
	//
	try {
		if (this.m_exit_status == 0)
			msg += stringBundleString(sbsSuccess);
		else
		{
			msg += stringBundleString(sbsFailure) + "\n\n";
			var arglength = this.m_a_valid_code[this.failcode()]['arglength'];

			if (arglength > 0)
			{
				if (arglength != this.m_fail_arg.length)
					zinAssertAndLog(false, "this: " + this.toString());

				msg += stringBundleString(this.failCodeStringId(), this.m_fail_arg);
			}
			else
				msg += stringBundleString(this.failCodeStringId());

			if (this.m_a_valid_code[this.failcode()]['trailer'])
				msg += "\n\n" + this.m_fail_trailer;

			msg += "\n \n";
		}
	} catch (ex) {
		dump("asMessage: exception: " + ex.message + "\n");
		this.m_logger.debug("asMessage: exception: " + ex.message);
	}

	return msg;
}
