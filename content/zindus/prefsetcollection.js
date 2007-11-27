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
 * Portions created by Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 * 
 * Contributor(s): Leni Mayo
 * 
 * ***** END LICENSE BLOCK *****/

// this class is a collection (of either Account or Profile)
//

function PrefSetCollection(template)
{
	var mp;

	zinAssert(typeof(template.load) == "function" &&
	          typeof(template.save) == "function" &&
		      typeof(template.m_prefprefix) != "undefined");

	this.m_template = template;
	this.m_collection = new Array();

	mp = new MozillaPreferences();

	this.m_prefs = mp.branch();
}

PrefSetCollection.START_NUMBERING_AT=1000;  // leaves plenty of room for default preferences 0-999

PrefSetCollection.prototype.load = function(branch)
{
	var i, obj, isLoaded, aid;

	zinAssert(arguments.length <= 1);

	aid = this.getAllIds(this.m_template.m_prefprefix);

	for (i in aid)
	{
		dump("PrefSetCollection.prototype.load - loading a prefset: " + this.m_template.m_prefprefix + "." + i + "\n");

		obj = zinCloneObject(this.m_template);
		isLoaded = obj.load(i, this.m_prefs);

		if (isLoaded)
		{
			this.m_collection.push(obj);
		}
		else
		{
			// failed to load a pref - each one of the sub-sub-prefs wasn't there.
			// I guess we just ignore that prefset...
		}
	}
}

PrefSetCollection.prototype.save = function()
{
	this.foreach(new FunctorSave());
}

PrefSetCollection.prototype.remove = function(id)
{
	// dump("PrefSetCollection.prototype.remove() about to remove array element " + id + " from " + this.toString() + "\n");
	// dump("PrefSetCollection.prototype.remove() about to remove this.m_collection[" + id + "] == " + this.m_collection[id].toString() + "\n");

	this.m_collection[id].remove();

	this.m_collection.splice(id, 1);
}

// find the first unused m_id in the collection starting from 0
//
PrefSetCollection.prototype.getNextId = function()
{
	var i, ret;
	var present = new Array;

	for (i = 0; i < this.m_collection.length; i++)
		present[this.m_collection[i].m_id] = "";

	// notice that this loops to '<=' while the above loops to '<'
	// caters for the "no empty space, add at the end" use case

	for (i = PrefSetCollection.START_NUMBERING_AT; i <= (PrefSetCollection.START_NUMBERING_AT + this.m_collection.length); i++)
		if (present[i] == undefined)
		{
			ret = i;
			break;
		}

	// dump("PrefSetCollection.prototype.getNextId returns " + ret + "\n");

	return ret;
}

// count default prefsets by totalling the number of ids below PrefSetCollection.START_NUMBERING_AT
//
PrefSetCollection.prototype.countDefault = function()
{
	var ret = 0;

	for (i = 0; i < this.m_collection.length; i++)
		if (this.m_collection[i].m_id < PrefSetCollection.START_NUMBERING_AT)
			ret++;
	
	return ret;
}

PrefSetCollection.prototype.toString = function()
{
	var f = new FunctorToString();

	zinAssert(f != null);

	this.foreach(f);

	return f.m_string;
}

// return an array of all ids corresponding to the given prefprefix
// For example: getAllIds('profile') might return [0, 1000, 1001]   (one default, two user-defined profiles)
//
PrefSetCollection.prototype.getAllIds = function(prefprefix)
{
	var i, obj, children, pat, isLoaded, re, aid, res;

	// children is an array of all the preferences of prefsets keyed off prefprefix
	// So for example, if prefprefix == "account",
	// then children = [ "account.0.blah1", "account.0.blah2", ... , "account.2.blah1", ... ]

	children = this.m_prefs.getChildList(prefprefix + ".", {});

	// The preferences that we are interested in are of the form 
	// this.m_template.m_prefprefix . <number> . property

	pat = "^" + prefprefix + "\\.(\\d+)\\..*";
	re = new RegExp(pat);

	// javascript doesn't support associative arrays:
	// http://ajaxian.com/archives/javascript-associative-arrays-considered-harmful
	// Setting properties on an Object serves our purpose here...
	//
	aid = new Object;

	for (i = 0; i < children.length; i++)
	{
		res = re.exec(children[i]);

		if (res != null)
			aid[res[1]] = res[1];
	}

	// dump("PrefSetCollection.prototype.getAllIds - children is " + children.toString() + "\n");
	// dump("PrefSetCollection.prototype.getAllIds - pat is " + pat + "\n");
	// dump("PrefSetCollection.prototype.getAllIds - and the relevant ids are\n");

	return aid;
}

PrefSetCollection.prototype.foreach = function(functor)
{
	for (i in this.m_collection)
	{
		functor.run(this.m_collection[i]);
	}
}

function FunctorToString()
{
	this.m_string = "";
}


FunctorToString.prototype.run = function(obj)
{
	this.m_string += " " + obj.toString();
}

function FunctorSave()
{
}

FunctorSave.prototype.run = function(obj)
{
	obj.save();
}