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

const APP_NAME="zindus";
const APP_VERSION_NUMBER="0.6.7";                      // this line generated by build.sh
const APP_VERSION_DATA_CONSISTENT_WITH="0.6.5.20071106.043643";        // remove the data files (forcing a slow sync) if data was
                                                                       // generated by a software version older than this

const SHOW_STATUS_PANEL_IN = [ 'folderPaneBox', 'addressbookWindow' ]; // the status + progress panels are visibile and updated
                                                                       // in windows containing these ids.

const SOAP_REQUEST_FAILED = -12344;               // fake an error code to workaround a bug in mozilla soap

const ZM_ID_TRASH         = 3;                    // see: ZimbraServer/src/java/com/zimbra/cs/mailbox/Mailbox.java
const ZM_CONTACTS         = "Contacts";
const ZM_EMAILED_CONTACTS = "Emailed Contacts";
const ZM_FIRST_USER_ID    = 256;

const TBCARD_ATTRIBUTE_LUID     = "zid";          // user-defined attributes associated with thunderbird cards
const TBCARD_ATTRIBUTE_CHECKSUM = "zcs";

const TB_PAB = "Personal Address Book";

const FORMAT_TB = 0;
const FORMAT_ZM = 1;

const SOURCEID_TB = 1;
const SOURCEID_ZM = 2;
