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

// An object of this class is updated as a SyncFsm progresses from start to finish.
// It's state includes both percentage complete and per-fsm-state text detail.
//
function SyncFsmObserver(es)
{
	this.state = null; // SyncFsm.state, used on a read-only basis, set before any update

	this.m_logger = newLogger("SyncFsmObserver");

	this.m_es = es;

	this.m_properties = new Object();

	this.m_high_water_percentage_complete = 0;
	this.m_a_states_seen = new Object();

	this.set(SyncFsmObserver.OP,       "");
	this.set(SyncFsmObserver.PROG_MAX, 0);
	this.set(SyncFsmObserver.PROG_CNT, 0);

	this.m_perf = newObject(
		'm_last_state',    null,
		'm_stopwatch',     new StopWatch("SyncFsmObserver"),
		'm_a_per_state',   new Array());  // of { name, elapsed_time }
}

SyncFsmObserver.OP                  = 'op'; // eg: server put
SyncFsmObserver.PROG_CNT            = 'pc'; // eg: 3 of
SyncFsmObserver.PROG_MAX            = 'pm'; // eg: 6    (counts progress through an iteration of one or two states)
SyncFsmObserver.PROG_AS_PERCENT     = 'pt'; // eg: false ==> show 3 of 6, true ==> show 50%
SyncFsmObserver.PERCENTAGE_COMPLETE = 'pp'; // eg: 70%  (counts how far we are through all observed states)

SyncFsmObserver.prototype = {
	set : function(key, value) {
		this.m_properties[key] = value;
	},
	get : function(key, value) {
		return this.m_properties[key];
	},
	progressReportOn : function(stringid) {
		this.set(SyncFsmObserver.OP, stringBundleString(this.tweakStringId(stringid)) );
		this.set(SyncFsmObserver.PROG_MAX, 0);
	},
	progressReportOnSource : function() {
		let a = arguments;
		zinAssertAndLog((a.length == 2) || (typeof(a[2]) == 'number'), function() { return "length: "+a.length+" typeof: "+typeof(a[2]);});

		this.set(SyncFsmObserver.OP, this.buildOp(a[0], a[1]));
		this.set(SyncFsmObserver.PROG_MAX, (a.length == 3) ? a[2] : 0);
	},
	buildOp : function(sourceid, stringid) {
		return this.sourceName(sourceid) + " " + stringBundleString(this.tweakStringId(stringid));
	},
	sourceName : function(sourceid) {
		zinAssertAndLog(sourceid in this.state.sources, sourceid);

		return this.state.sources[sourceid]['format'] == FORMAT_TB ? format_xx_to_localisable_string(FORMAT_TB).toLowerCase() :
		                                                             stringBundleString("brand.server").toLowerCase();
	},
	tweakStringId : function(stringid) {
		return "progress." + stringid;
	},
	progressToString : function() {
		var ret = "";

		ret += this.get(SyncFsmObserver.OP);

		if (this.get(SyncFsmObserver.PROG_MAX) > 0)
			if (this.get(SyncFsmObserver.PROG_AS_PERCENT))
				ret += " " + parseInt(this.get(SyncFsmObserver.PROG_CNT) / this.get(SyncFsmObserver.PROG_MAX) * 100) + " %";
			else
				ret += " " + this.get(SyncFsmObserver.PROG_CNT) +
				       " " + stringBundleString(this.tweakStringId("of")) +
				       " " + this.get(SyncFsmObserver.PROG_MAX);

		return ret;
	},
	update : function(fsmstate) {
		var ret;

		var a_states_ld = {
			stAuthSelect:     { count: 1 },
			stAuthLogin:      { count: 1 },
			stAuthCheck:      { }
		};

		var a_states_zm = {
			stAuthSelect:     { count: 1 },
			stAuthLogin:      { count: 1 },
			stAuthPreAuth:    { count: 1 },
			stAuthCheck:      { },
			stGetInfo:        { count: 1 },
			stGetAccountInfo: { count: 1 },
			stSelectSoapUrl:  { count: 1 },
			stSync:           { },
			stSyncResponse:   { },
			stGetContactZm:   { count: 1 },
			stGalConsider:    { },
			stGalSync:        { count: 1 },
			stGalCommit:      { },
			stGetContactPuZm: { count: 1 },
			stUpdateZm:       { },
			stUpdateZmHttp:   { count: 1 }
		};

		var a_states_gd = {
			stAuth:           { count: 1 },
			stAuthCheck:      { },
			stGetGroupsGd1:   { count: 1 },
			stGetGroupsGd2:   { },
			stRenameGroups:   { },
			stGetContactGd1:  { count: 1 },
			stGetContactGd2:  { count: 1 },
			stGetContactGd3:  { count: 1 },
			stGetPhotoGd:     { count: 1 },
			stDeXmlifyAddrGd: { },
			stConfirmUI:      { },
			stGetGroupPuGd:   { count: 1 },
			stGetContactPuGd: { count: 1 },
			stUpdateGd:       { count: 1 },
			stUpdateGdPhoto:  { count: 1 }
		};

		var a_states_common = {
			start:            { count: 1 },
			stLoad:           { count: 1 },
			stLoadTb:         { count: 1 },
			stConverge:       { count: 5 },
			stUpdateTb:       { count: 1 },
			stUpdateCleanup:  { count: 1 },
			stHttpRequest:    { },
			stHttpResponse:   { },
			stCommit:         { },
			final:            { count: 1 }
		};

		for (var state in a_states_common) {
			zinAssertAndLog(!(state in a_states_zm), "state: " + state);
			zinAssertAndLog(!(state in a_states_gd), "state: " + state);
			a_states_gd[state] = a_states_common[state];
			a_states_ld[state] = a_states_common[state];
			a_states_zm[state] = a_states_common[state];
		}

		switch (fsmstate.context.state.id_fsm) {
			case Maestro.FSM_ID_LD_AUTHONLY:
			case Maestro.FSM_ID_LD_TWOWAY:
				ret = this.updateState(fsmstate, a_states_ld);
				break;
			case Maestro.FSM_ID_ZM_AUTHONLY:
			case Maestro.FSM_ID_ZM_TWOWAY:
				ret = this.updateState(fsmstate, a_states_zm);
				break;
			case Maestro.FSM_ID_GD_AUTHONLY:
			case Maestro.FSM_ID_GD_TWOWAY:
				ret = this.updateState(fsmstate, a_states_gd);
				break;
			default:
				zinAssertAndLog(false, "unmatched case: id_fsm: " + fsmstate.context.state.id_fsm);
		};

		return ret;
	},
	gd_update_progress : function(a, fsmstate, string_id, is_percent, state_progress_count) {
		let percentage_big_hand = 0;
		let is_update_ui        = true;

		if (a.length > 0) {
			if (!(fsmstate.newstate in this.state.a_state_entry_count)) {
				this.progressReportOnSource(this.state.sourceid_pr, string_id, a.length);
				this.set(SyncFsmObserver.PROG_CNT, 0);
			}

			let progress_count;
			if (state_progress_count)
				progress_count = this.state[state_progress_count];
			else
				progress_count = this.get(SyncFsmObserver.PROG_CNT) + 1;

			if (progress_count <= a.length) {
				this.set(SyncFsmObserver.PROG_CNT, progress_count);
				if (is_percent)
					this.set(SyncFsmObserver.PROG_AS_PERCENT, true);
				percentage_big_hand = progress_count / a.length;
			}
			else
				is_update_ui = false;
		}
		else
			is_update_ui = false;

		return [ is_update_ui, percentage_big_hand ];
	},
	updateState : function(fsmstate, a_states) {
		var ret = false;
		var percentage_big_hand = 0;
		var context = fsmstate.context; // SyncFsm
		var es, key, progress_count;

		this.m_logger.debug("update: fsmstate: " + (fsmstate ? fsmstate.toString() : "null"));

		this.state = context.state;
		this.set(SyncFsmObserver.PROG_AS_PERCENT, false);

		// this.m_logger.debug("updateState: blah: a_states: " +      aToString(a_states));
		// this.m_logger.debug("updateState: blah: m_transitions: " + aToString(context.fsm.m_transitions));

		key = firstDifferingObjectKey(a_states, context.fsm.m_transitions);
		zinAssertAndLog(!key, key);

		this.m_a_states_seen[fsmstate.newstate] = true;
		var count_states_seen = 0;
		var count_states_all = 0;

		for (key in a_states)
			if ('count' in a_states[key]) {
				if (key in this.m_a_states_seen)
					count_states_seen += a_states[key]['count'];

				count_states_all += a_states[key]['count'];
			}

		if (false)
		this.m_logger.debug("a_states: "      + aToString(a_states) + "\n" +
		                    "a_states_seen: " + aToString(this.m_a_states_seen) + "\n" +
		                    " count_states_seen: " + count_states_seen + " count_states_all: " + count_states_all );

		if (fsmstate.newstate && ('count' in a_states[fsmstate.newstate])) { // fsmstate.newstate == null when oldstate == 'final'
			let a;

			ret = true;

			key = context.state.m_progress_yield_text && this.m_perf.m_last_state == fsmstate.newstate ?
			          hyphenate('-', fsmstate.newstate, fsmstate.event, context.state.m_progress_yield_text) :
			          hyphenate('-', fsmstate.newstate, fsmstate.event);

			this.m_perf.m_a_per_state.push(newObject(key, this.m_perf.m_stopwatch.elapsed()));
			this.m_perf.m_last_state = fsmstate.newstate;

			switch(fsmstate.newstate) {
				case 'start':
					// this.progressReportOn("load.addressbooks");
					this.set( SyncFsmObserver.OP, stringBundleString(this.tweakStringId("load.addressbooks"),
					             [ format_xx_to_localisable_string(FORMAT_TB) ]));
					this.set(SyncFsmObserver.PROG_MAX, 0);
					break;
				case 'stAuthSelect':
				case 'stAuthLogin':
				case 'stAuthPreAuth':
				case 'stAuth':           this.progressReportOnSource(context.state.sourceid_pr, "remote.auth");  break;
				case 'stLoad':           this.progressReportOn("load");                                          break;
				case 'stGetInfo':        this.progressReportOnSource(context.state.sourceid_pr, "account.info"); break;
				case 'stGetAccountInfo': this.progressReportOnSource(context.state.sourceid_pr, "account.info"); break;
				case 'stSync':
				case 'stSyncResponse':
				case 'stGetGroupsGd1':
				case 'stGetContactGd1':
				case 'stGetContactGd2':  this.progressReportOnSource(context.state.sourceid_pr, "remote.sync");  break;
				case 'stGalSync':
				case 'stGalCommit':      this.progressReportOnSource(context.state.sourceid_pr, "get.gal");      break;
				case 'stLoadTb':         this.progressReportOnSource(context.state.sourceid_tb, "load");         break;
				case 'stUpdateTb':       this.progressReportOnSource(context.state.sourceid_tb, "put.one");      break;
				case 'stUpdateCleanup':  this.progressReportOn("saving");                                        break;

				case 'stConverge': {
					let progress_max = 12;

					if (fsmstate.event != 'evRepeat') {
						this.set(SyncFsmObserver.OP, stringBundleString(this.tweakStringId("converge")) );
						this.set(SyncFsmObserver.PROG_MAX, progress_max);
					}

					this.set(SyncFsmObserver.PROG_CNT, context.state.m_progress_count);
					this.set(SyncFsmObserver.PROG_AS_PERCENT, true);
					percentage_big_hand = context.state.m_progress_count / progress_max;
					break;
				}

				case 'stSelectSoapUrl':
					if (context.state.suggestedSoapURL && !context.is_a_zm_tested_soapurl(context.state.suggestedSoapURL)) {
						this.progressReportOnSource(context.state.sourceid_pr, "soapurl");
						this.set(SyncFsmObserver.OP, this.get(SyncFsmObserver.OP) + " " + context.state.suggestedSoapURL + "<br/>" +
						                             stringBundleString(this.tweakStringId("soapurl2"), [ url('what-is-soapURL') ] ));
					}
					else
						ret = false; // no need to update the UI
					break;

				case 'stGetContactZm':
				case 'stGetContactPuZm':
					let self = this;
					[ ret, percentage_big_hand ] = this.updateStateBatch("get.many", context, function(type) {
						let ret = (type == 'total') ? context.state.aContact.length : SyncFsm.GetContactZmNextBatch(context.state.aContact).length;
						return ret;
					} );
					this.m_logger.debug("updateState: after: ret: " + ret + " percentage_big_hand: " + percentage_big_hand);
					break;

				case 'stGetContactGd3':
					a = this.state.m_gd_progress_array;
					[ ret, percentage_big_hand ] = this.gd_update_progress(a, fsmstate, "get.many", true, 'm_gd_progress_count');
					break;

				case 'stGetPhotoGd':
					if (AppInfo.is_photo()) {
						a = this.state.a_gd_photo_to_get;
						[ ret, percentage_big_hand ] = this.gd_update_progress(a, fsmstate, "get.photos", false, null);
					}
					else
						ret = false;
					break;

				case 'stUpdateGdPhoto':
					if (AppInfo.is_photo()) {
						a = this.state.a_gd_photo_to_put;
						[ ret, percentage_big_hand ] = this.gd_update_progress(a, fsmstate, "put.photos", false, null);
					}
					else
						ret = false;
					break;

				case 'stGetGroupPuGd':
					a = this.state.a_gd_to_get[GoogleData.eElement.group];
					[ ret, percentage_big_hand ] = this.gd_update_progress(a, fsmstate, "get.many", false, null);
					break;

				case 'stGetContactPuGd':
					a = this.state.a_gd_to_get[GoogleData.eElement.contact];
					[ ret, percentage_big_hand ] = this.gd_update_progress(a, fsmstate, "get.many", false, null);
					break;

				case 'stUpdateZmHttp':
					[ ret, percentage_big_hand ] = this.updateStateBatch("put.many", context,
						function (type) {
							return (type == 'total') ? context.state.m_a_remote_update_package.m_c_total :
							                           context.state.m_a_remote_update_package.m_c_used_in_current_batch;
						});
					break;

				case 'stUpdateGd': {
					let max_suos = 0;

					if (!context.state.m_suo_generator)
						max_suos = Suo.count(context.state.aSuo, function(sourceid, bucket) { return sourceid == context.state.sourceid_pr; });

					if (context.state.m_suo_generator || max_suos > 0) {
						var op = this.buildOp(context.state.sourceid_pr, "put.many");

						if (this.get(SyncFsmObserver.OP) != op) {
							this.progressReportOnSource(context.state.sourceid_pr, "put.many", max_suos);
							this.set(SyncFsmObserver.PROG_CNT, 0);
						}

						progress_count = this.get(SyncFsmObserver.PROG_CNT) + 1;

						if (progress_count > this.get(SyncFsmObserver.PROG_MAX))
							ret = false;
						else {
							this.set(SyncFsmObserver.PROG_CNT, progress_count);
							percentage_big_hand = progress_count / this.get(SyncFsmObserver.PROG_MAX);
						}
					}
					else
						this.progressReportOnSource(context.state.sourceid_pr, "put.one");
					break;
					}

				case 'final':
					if (fsmstate.event == 'evCancel')
						this.progressReportOn("cancelled");
					else
						this.progressReportOn("done");

					es = this.m_es;

					if (fsmstate.event == 'evCancel') {
						es.m_exit_status = 1;

						if (context.state.m_http && context.state.m_http.isFailed()) {
							es.failcode(context.state.m_http.failCode());

							if (typeof(context.state.m_http.faultLoadFromXml) == 'function')  // for some reason instanceof doesn't work here
							{
								if (context.state.m_http.m_faultstring)
									es.m_fail_trailer = context.state.m_http.m_faultstring + "\n\n";
								else if (context.state.m_http.m_faultcode)
									es.m_fail_trailer = context.state.m_http.m_faultcode + "\n\n";

								es.m_fail_trailer += stringBundleString("text.zm.soap.method", [ context.state.m_http.m_method ]);
							}
						}
						else
							es.failcode('failon.cancel');
					}
					else if (fsmstate.event == 'evLackIntegrity')
					{
						es.m_exit_status = 1;

						if (context.state.stopFailCode)
							es.failcode(context.state.stopFailCode);
						else
							es.failcode('failon.unexpected');

						if (context.state.stopFailTrailer)
							es.m_fail_trailer = context.state.stopFailTrailer;
					}
					else if (context.state.authToken && (context.state.id_fsm in Maestro.FSM_GROUP_AUTHONLY))
						es.m_exit_status = 0;
					else if (fsmstate.event == 'evNext' && (context.state.id_fsm in Maestro.FSM_GROUP_TWOWAY))
						es.m_exit_status = 0;
					else
						zinAssert(false); // ensure that all cases are covered above

					if (context.state.stopFailArg)
						es.m_fail_arg = context.state.stopFailArg;

					if (es.failcode() == 'failon.unexpected') {
						if (context.state.stopFailTrailer)
							es.m_fail_trailer = context.state.stopFailTrailer;
						else
							es.m_fail_trailer = stringBundleString("text.file.bug", [ url('reporting-bugs') ]);
					}
					else if (es.failcode() == 'failon.service')
						es.m_fail_trailer = stringBundleString("status.failon.service.detail", [ AppInfo.app_name(AppInfo.firstcap) ]);
					else if (es.failcode() == 'failon.cancel')
						es.m_fail_trailer = stringBundleString("status.failon.cancel.detail");

					if (es.m_exit_status != 0)
						es.m_fail_fsmoldstate = fsmstate.oldstate;

					for (var i = 0; i < context.state.aConflicts.length; i++)
						this.m_logger.info("conflict: " + context.state.aConflicts[i]);

					es.m_count_conflicts = context.state.aConflicts.length;

					this.m_logger.debug("exit status: " + es.toString());

					if (this.m_perf) {
						let msg = "m_perf: ";
						let obj = null;
						let key = null;
						let prev = 0;

						for (let i = 0; i < this.m_perf.m_a_per_state.length; i++) {
							obj = this.m_perf.m_a_per_state[i];
							key = firstKeyInObject(obj);
							msg += "\n " + strPadTo(key, 40) + "  " + obj[key] + " " + (obj[key] - prev);
							prev = obj[key];
						}

						this.m_logger.debug(msg);
					}

					break;

				default:
					zinAssertAndLog(false, "missing case statement for: " + fsmstate.newstate);
			}

			var percentage_complete = count_states_seen / count_states_all;

			if (false)
			this.m_logger.debug("BLAH 3: " +
					" percentage_complete: " + percentage_complete +
			        " percentage_big_hand: " + percentage_big_hand +
			        " percentage_big_hand corrected: " + percentage_big_hand / count_states_all );

			if (percentage_big_hand)
				zinAssert(this.get(SyncFsmObserver.PROG_MAX) > 0);

			percentage_big_hand = ZinMin(percentage_big_hand, 0.99);

			percentage_complete += percentage_big_hand / count_states_all;

			// With shared addressbooks, we jump from Sync back to Getaccount.info
			// The progress indicator jumping backwards isn't a good look - this holds it steady.
			// Going backwards means we lose the "percentage_big_hand" value too.
			// It'd be better to show incremental progress but we don't know at the outset
			// how many contacts there are going to be in each of the shared addressbooks so it'd be tricky.
			//
			if (percentage_complete < this.m_high_water_percentage_complete)
				percentage_complete = this.m_high_water_percentage_complete;
			else
				this.m_high_water_percentage_complete = percentage_complete;

			this.set(SyncFsmObserver.PERCENTAGE_COMPLETE, percentage_complete * 100 + "%");
		}

		return ret;
	},
	updateStateBatch : function(stringid, context, fn) {
		zinAssertAndLog(typeof(fn) == 'function', typeof(fn));

		let c_total = fn('total');
		let ret     = true;
		let percentage_big_hand;

		if (c_total > 0) {
			let op = this.buildOp(context.state.sourceid_pr, stringid);

			if (this.get(SyncFsmObserver.OP) != op) {
				this.progressReportOnSource(context.state.sourceid_pr, stringid, c_total);
				this.m_batch_count = 1;
				this.m_batch_max   = c_total;
			}

			let c_batch = fn('batch');

			if (c_batch == 0)
				ret = false;
			else {
				let lo      = this.m_batch_count;
				let hi      = ZinMin(this.m_batch_count + c_batch - 1, this.m_batch_max);

				if (lo == hi)
					this.set(SyncFsmObserver.PROG_CNT, lo);
				else
					this.set(SyncFsmObserver.PROG_CNT, hyphenate('-', lo, hi));

				percentage_big_hand = lo / this.m_batch_max;
				this.m_batch_count += c_batch;
			}
		}
		else
			ret = false; // no need to update the UI

		this.m_logger.debug("updateStateBatch: stringid: " + stringid + " c_total: " + c_total + " returns: ret: " + ret +
		                     " percentage_big_hand: " + percentage_big_hand);

		return [ ret, percentage_big_hand ];
	}
};
