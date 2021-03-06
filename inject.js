var fields = [];
var mySysId = '';
var atfMode = false;
var atfChannel;

if (typeof jQuery != "undefined") {
    jQuery(function () {
        if (typeof angular != "undefined")
            setTimeout(getListV3Fields, 2000);
        else
            doubleClickToSetQueryListV2();

        doubleClickToShowField();
        clickToList();
        setShortCuts();
        bindPaste();
        makeReadOnlyContentCopyable();
        startMessageChannel();

    });
}

//used to communicate between browser tabs when recording ATF steps
function startMessageChannel() {
    if (typeof g_form != 'undefined') {

        if (g_form.tableName == "sys_atf_step" || window.name == "atfMode") {
            atfChannel = new BroadcastChannel(g_ck);

            if (g_form.tableName == "sys_atf_step") {
                atfChannel.postMessage(getStepDetails(g_form.getValue("step_config")));
            }
            atfChannel.onmessage = function (ev) {
                if (ev.data.step != "undefined") {
                    delQry();
                    g_form.addInfoMessage(ev.data.step);
                    //console.log(ev);
                } else {
                    g_form.setValue(getStepDetails(g_form.getValue("step_config")).return.read_only, ev.data.set.read_only);

                }
            }


        }
    }


}


function doubleClickToShowField() {
    if (typeof g_form != 'undefined') {
        document.addEventListener("dblclick", function (event) {
            if (jQuery(event.target).hasClass('label-text')) {
                var elm = jQuery(event.target).closest('div.form-group').attr('id').split('.').slice(2).join('.');
                var val = g_form.getValue(elm);
                var newValue = prompt('Value of ' + elm, val);
                if (newValue !== null)
                    g_form.setValue(elm, newValue);
            }
        }, true);
    }
}

function doubleClickToSetQueryListV2() {
    //dbl click to view and update filter condition
    jQuery('div.breadcrumb_container').on("dblclick", function (event) {
        var qry = GlideList2.get(jQuery('#sys_target').val());
        var newValue = prompt('Filter condition:', qry.filter);
        if (newValue !== qry.filter && newValue !== null) {
            qry.setFilterAndRefresh(newValue);
        }
    });
}

var qry = '';
var qryDisp = '';

function clickToList() {



    if (typeof g_form != 'undefined') {
        document.addEventListener("click", function (event) {

            if ((event.ctrlKey || event.metaKey)) {
                if (atfMode) {
                    generateATFValues(event);
                    return;
                }
                var tpe = '';
                var tbl = g_form.getTableName();
                var elm = '';
                var elmDisp = '';
                var val = 'none';
                var valDisp = '';
                var operator = '=';
                var val;
                if (jQuery(event.target).hasClass('label-text')) {
                    elm = jQuery(event.target).closest('div.form-group').attr('id').split('.').slice(2).join('.');
                    tpe = g_form.getGlideUIElement(elm).type
                    //tpe = jQuery(event.target).closest('div.label_spacing').attr('type');
                    val = g_form.getValue(elm);

                    elmDisp = jQuery(event.target).text();

                    valDisp = g_form.getDisplayBox(elm) ? g_form.getDisplayBox(elm).value : g_form.getValue(elm);

                }
                if (jQuery(event.target).hasClass('container-fluid')) {
                    elm = 'sys_id';
                    val = g_form.getUniqueValue();

                    elmDisp = 'DisplayValue';
                    valDisp = g_form.getDisplayValue();
                }
                if (val == 'none') return;

                if (tpe == 'glide_list' && elm != 'sys_id') {
                    operator = 'LIKE';
                } else if (val.length == 0) {
                    val = '';
                    valDisp = '';
                    operator = 'ISEMPTY';
                } else if (tpe == 'glide_date_time' || tpe == 'glide_date') {

                    operator = 'ON';
                    //do some magic to get encodedquery to generate date
                    var dte = val.substring(0, 10);
                    valDisp = dte;
                    var dateNumber = getDateFromFormat(g_form.getValue(elm), g_user_date_time_format);
                    var dateJs = new Date(dateNumber)
                    dte = dateJs.getFullYear() + '-' +
                        ("0" + (dateJs.getMonth() + 1)).slice(-2) + '-' +
                        ("0" + dateJs.getDate()).slice(-2);

                    val = dte + "@javascript:gs.dateGenerate('" + dte + "','start')@javascript:gs.dateGenerate('" + dte + "','end')";

                } else if (val.length > 60) {
                    val = val.substring(0, 60);
                    valDisp = val;
                    operator = 'LIKE';
                }


                var idx = qry.indexOf(elm + operator);
                if (idx > -1) {
                    qry = qry.replace(elm + operator + val + '^', '');
                    qryDisp = qryDisp.replace(elmDisp + ' ' + operator + ' <b>' + valDisp + '</b> > ', '');
                } else {
                    qry += elm + operator + val + '^';
                    qryDisp += elmDisp + ' ' + operator + ' <b>' + valDisp + '</b> > ';
                }

                var listurl = '/' + tbl + '_list.do?sysparm_query=' + qry;
                g_form.clearMessages();
                if (qry) {
                    var qryDisp2 = qryDisp.substring(0, qryDisp.length - 3);
                    g_form.addInfoMessage('Filter for ' + tbl + ' <a href="javascript:delQry()">delete</a> :<a href="' + listurl + '" target="' + tbl + '">List filter: ' + qryDisp2 + '</a>');
                }
            }
        }, true);
    }
}

function generateATFValues(event) {
    var tpe = '';
    var tbl = g_form.getTableName();
    var elm = '';
    var elmDisp = '';
    var val = 'none';
    var valDisp = '';
    var operator = '=';
    var val;
    if (jQuery(event.target).hasClass('label-text')) {
        elm = jQuery(event.target).closest('div.form-group').attr('id').split('.').slice(2).join('.');
        tpe = g_form.getGlideUIElement(elm).type
        //tpe = jQuery(event.target).closest('div.label_spacing').attr('type');
        val = g_form.getValue(elm);

        elmDisp = jQuery(event.target).text();

        if (tpe == "reference")
            valDisp = g_form.getDisplayBox(elm).value;
        else
            valDisp = val;


    }
    if (val == 'none' || val == '') return;

    else if (tpe == 'glide_date_time' || tpe == 'glide_date') {

        //operator = 'ON';
        //do some magic to get encodedquery to generate date
        var dte = val.substring(0, 10);
        valDisp = dte;
        var dateNumber = getDateFromFormat(g_form.getValue(elm), g_user_date_time_format);
        var dateJs = new Date(dateNumber)
        dte = dateJs.getFullYear() + '-' +
            ("0" + (dateJs.getMonth() + 1)).slice(-2) + '-' +
            ("0" + dateJs.getDate()).slice(-2);

        val = dte;

    } else if (val.length > 60) {
        valDisp = val.substring(0, 60) + '...';
    }
    var idx = qry.indexOf('^' + elm + operator);
    if (idx > -1) {
        qry = qry.replace('^' + elm + operator + val, '');
        qryDisp = qryDisp.replace("- " + elmDisp + ' ' + operator + ' <b>' + valDisp + '</b><br />', '');
    } else {
        qry += '^' + elm + operator + val;
        qryDisp += "- " + elmDisp + ' ' + operator + ' <b>' + valDisp + '</b><br />';
    }

    var listurl = qry.substring(1, 10000);
    g_form.clearMessages();
    if (qry) {
        var qryDisp2 = qryDisp.substring(0, qryDisp.length - 6);
        g_form.addInfoMessage('Input values ' + tbl + ' <a href="javascript:delQry()">delete</a><br />' + qryDisp2 + '<br /><input type="text" class="form-control" value="' + listurl + '"></input>');
    }



}
var vals;

function getFieldStates() {
    vals = {
        "visible": [],
        "not_visible": [],
        "read_only": [],
        "not_read_only": [],
        "not_mandatory": [],
        "mandatory": []
    };
    for (var i = 0; i < g_form.elements.length; i++) {
        var elm = g_form.elements[i];
        var mid = 'div[id="element.' + elm.tableName + '.' + elm.fieldName + '"]'
        if (jQuery(mid).is(":visible") && jQuery(mid).css('visibility') !== 'hidden') {
            vals.visible.push(elm.fieldName);
            if (elm.mandatory)
                vals.mandatory.push(elm.fieldName);
            else
                vals.not_mandatory.push(elm.fieldName);

            if (jQuery(elm.getElement()).is('[readonly]'))
                vals.read_only.push(elm.fieldName);
            else
                vals.not_read_only.push(elm.fieldName);

        } else
            vals.not_visible.push(elm.fieldName);
    }
}

function delQry() {
    qry = '';
    qryDisp = '';
    g_form.clearMessages();
}


function loadScript(url) {
    return new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.onload = resolve;
        script.onerror = reject;
        script.src = url;
        document.getElementsByTagName("head")[0].appendChild(script);
    });
}

function loadjQuery() {
    if (window.jQuery) {
        // already loaded and ready to go
        return Promise.resolve();
    } else {
        return loadScript('//code.jquery.com/jquery-latest.min.js');
    }
}

/**
 * this solves an issue where e.g. OOTB read-only Script Include content was not copyable
 */
function makeReadOnlyContentCopyable() {
    try {
        if (typeof g_glideEditorArray != 'undefined' && g_glideEditorArray instanceof Array) {
            for (var i = 0; i < g_glideEditorArray.length; i++) {
                if (g_glideEditorArray[i].editor.getOption('readOnly') == 'nocursor')
                    g_glideEditorArray[i].editor.setOption('readOnly', true);
            }
        }
    } catch (error) {
        console.error(error)
    }
}


function addTechnicalNames() {

    if (typeof jQuery == 'undefined') return; //not in studio

    if (typeof g_form != 'undefined') {
        jQuery(".label-text:not(:contains('|'))").each(function (index, value) {

            var elm = jQuery(this).closest('div.form-group').attr('id').split('.').slice(2).join('.');
            jQuery(this).prepend('<i>' + elm + ' | </i> ');
        });
    };

    jQuery('th.list_hdr, th.table-column-header').each(function (index) {
        var tname = jQuery(this).attr('name') || jQuery(this).data('column-name');
        if (jQuery(this).find('a.list_hdrcell, a.sort-columns').text().indexOf('|') == -1)
            jQuery(this).find('a.list_hdrcell, a.sort-columns').prepend('<i>' + tname + ' | </i> ');
    });

    //also show viewname
    var viewName = jQuery('input#sysparm_view').val();
    if (viewName && !jQuery('i.viewName').length)
        jQuery('.section-content').first().prepend('<i class="viewName">Viewname: ' + viewName + '</i><br /> ');

    showSelectFieldValues();
    searchLargeSelects();
}

function showSelectFieldValues() {
    if (typeof jQuery == 'undefined') return; //not in studio

    jQuery('option').not(":contains('=>')").each(function (i, el) {
        var jqEl = jQuery(el);
        jqEl.html(el.text + ' => ' + el.value);
    });

    jQuery('#tableTreeDiv td.tree_item_text > a').not(":contains('=>')").each(function (i, el) {
        var jqEl = jQuery(el);
        jqEl.html(el.text + ' => ' + el.name);
    });
}

function searchLargeSelects() {

    if (typeof jQuery.fn.filterByText == 'undefined') {
        jQuery.fn.filterByText = function (textbox, selectSingleMatch) {
            return this.each(function () {
                var select = this;
                var options = [];
                jQuery(select).find('option').each(function () {
                    options.push({
                        value: jQuery(this).val(),
                        text: jQuery(this).text()
                    });
                });
                jQuery(select).data('options', options);
                jQuery(textbox).bind('change keyup', function () {
                    var options = jQuery(select).empty().data('options');
                    var search = jQuery.trim(jQuery(this).val());
                    var regex = new RegExp(search, "gi");

                    jQuery.each(options, function (i) {
                        var option = options[i];
                        if (option.text.match(regex) !== null) {
                            jQuery(select).append(
                                jQuery('<option>').text(option.text).val(option.value)
                            );
                        }
                    });
                    if (selectSingleMatch === true && jQuery(select).children().length === 1) {
                        jQuery(select).children().get(0).selected = true;
                    }
                });
            });
        };
    }


    var minItems = 25;

    jQuery('select:not(.searchified)').each(function (i, el) {
        if (jQuery(el).find('option').length >= minItems && el.id != 'slush_right') {
            var input = document.createElement("input");
            input.type = "text";
            input.placeholder = "Filter choices...";
            input.className = "form-control";
            input.style.marginBottom = "2px";

            jQuery(el).before(input).filterByText(input, true).addClass('searchified');
        }
    });
}






function setShortCuts() {

    document.addEventListener("keydown", function (event) {

        //across all pages to set focus to left menu
        if (((event.ctrlKey || event.metaKey) && event.shiftKey) && event.keyCode == 70) { //cmd||ctrl-shift-s
            var doc = (window.self == window.top) ? document : top.document;
            if (applicationFilterEl) { //switch between Navigator and search on hitting cmd-shift-f
                var elm = (document.activeElement.id != applicationFilterId) ? applicationFilterId : globalSearchId;
                doc.getElementById(elm).focus();
                doc.getElementById(elm).select();
            }
        }


        //a few specific for forms
        else if (typeof g_form != 'undefined') {
            mySysId = g_form.getUniqueValue();
            if ((event.ctrlKey || event.metaKey) && event.keyCode == 83) { //cmd-s

                event.preventDefault();
                var doInsertStay = false;
                if (event.shiftKey) {
                    doInsertStay = document.querySelectorAll('#sysverb_insert_and_stay').length;
                    if (!doInsertStay) {
                        g_form.addWarningMessage("Insert and Stay not available for this record (SN Utils Exentsion)");
                        return false;
                    }
                }
                var action = (g_form.newRecord || doInsertStay) ? "sysverb_insert_and_stay" : "sysverb_update_and_stay";
                gsftSubmit(null, g_form.getFormElement(), action);
                return false;
            } else if ((event.ctrlKey || event.metaKey) && event.keyCode == 85) { //cmd-u 
                event.preventDefault();
                var action = (g_form.newRecord) ? "sysverb_insert" : "sysverb_update";
                gsftSubmit(null, g_form.getFormElement(), action);
                return false;
            } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.keyCode == 84) { //cmd-shift-t 
                event.preventDefault();
                toggleATFMode();
                return false;
            }


        }


    }, false);

    //Helper for ATF show ui action sys_id 
    jQuery('.action_context').on('mouseover', function(event){
        if (event.ctrlKey || event.metaKey) {
            event.stopImmediatePropagation()
            prompt("UI Action:" + jQuery(this).text() + "\nsys_id",jQuery(this).attr('gsft_id'));
        } 
    
    });

}


function toggleATFMode() {
    if (typeof jQuery == 'undefined') return;

    if (jQuery('#header_atf_image').length) {
        jQuery('#header_atf_image').remove();
        atfMode = false;
        window.name = "";
    } else {
        jQuery('.navbar-title-display-value').append(' <span style="color:red" id="header_atf_image" class="icon icon-alert-triangle"> ATF Helper Active</span>');
        window.name = "atfMode";
        atfMode = true;
        delQry();
        startMessageChannel();
    }
}


function bindPaste() {

    if (typeof jQuery == 'undefined') return; //not in studio

    if (typeof g_form != 'undefined') {

        jQuery('#header_add_attachment').after('<button id="header_paste_image" title="Paste screenshot as attachment" class="btn btn-icon glyphicon glyphicon-paste navbar-btn" aria-label="Paste Image as Attachments" data-original-title="Paste Image as Attachments" onclick="tryPaste()"></button>');


        jQuery('body').bind('paste', function (e) {
            if (e.originalEvent.clipboardData.items.length > 0 && e.originalEvent.clipboardData.items[0].kind == "file") {
                if (g_form.isNewRecord()) {
                    g_form.clearMessages();
                    g_form.addWarningMessage('Please save record before pasting...');
                    return false;
                }
                g_form.addInfoMessage('<span class="icon icon-loading"></span> Pasted image being processed...');

                var fileInfo = e.originalEvent.clipboardData.items[0].getAsFile();
                var fr = new FileReader;
                fr.onloadend = function () {
                    var imgData = getBlob(fr.result);
                    saveImage(imgData, fileInfo);
                };
                fr.readAsDataURL(fileInfo);
            }
        });

    };
}

function tryPaste() {
    if (!document.execCommand('paste')) {
        g_form.clearMessages();
        g_form.addInfoMessage("Please hit cmd-v or ctrl-v if you want to paste a copied screenshot as attachment to this record. (SN Utils Exentsion)");
    }
}

function getBlob(encoded) {
    encoded = encoded.replace(/^data:image\/(png|jpeg);base64,/, "");
    var sliceSize = 1024;
    var byteCharacters = atob(encoded);
    var bytesLength = byteCharacters.length;
    var slicesCount = Math.ceil(bytesLength / sliceSize);
    var byteArrays = new Array(slicesCount);

    for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        var begin = sliceIndex * sliceSize;
        var end = Math.min(begin + sliceSize, bytesLength);

        var bytes = new Array(end - begin);
        for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    return new Blob(byteArrays, {
        type: "image/png"
    });
}

function saveImage(imgData, fileInfo) {

    if (typeof jQuery == 'undefined') return; //not in studio

    //var fileName = prompt("Filename to use:", fileInfo.name) || fileInfo.name;


    var URL = "/api/now/attachment/file?table_name=" +
        g_form.getTableName() + "&table_sys_id=" + g_form.getUniqueValue() + "&file_name=" + fileInfo.name;

    jQuery.ajax({
        url: URL,
        type: 'POST',
        contentType: 'application/octet-stream',
        data: imgData,
        processData: false,
        headers: {
            'Accept': 'application/json',
            'Content-Type': fileInfo.type,
            'Access-Control-Allow-Origin': '*',
            'X-UserToken': (typeof g_ck === 'undefined') ? '' : g_ck
        },
        contentType: 'application/json; charset=utf-8',
        success: function (r) {
            g_form.clearMessages();
            console.log(r);
            g_form.addInfoMessage("<span>Pasted image added as attachment<br /><a href='/" + r.result.sys_id + ".iix' target='myimg'><img src='" + r.result.sys_id + ".iix?t=small' alt='upload' style='display:inline!important; padding:20px;'/></a><br />" +
                `<div class="input-group">
        <input id='tbxImageName' onKeyUp='if (event.keyCode == 13) renamePasted("` + r.result.sys_id + `")' type="text" value="` + r.result.file_name.replace('.png', '') + `" style='width:200px;'class="form-control" placeholder="Image name">
        <span class="input-group-btn" style="display: inline; ">
          <button class="btn btn-primary" onClick='renamePasted("` + r.result.sys_id + `")' style="width: 80px;" type="button">.png Save..</button>
        </span>
      </div><span id='divRenamed'></span></form>`);
            $j('#tbxImageName').focus().select();

        },
        error: function (error) {
            console.log(error);
            g_form.clearMessages();
            g_form.addErrorMessage(error.responseJSON.error.detail)

        }
    });

};


function renamePasted(sysID, check) {

    if (!$j('#tbxImageName').val()) {
        alert("Please insert a valid filename.");
        return false;
    }


    var requestBody = {
        "file_name": $j('#tbxImageName').val()
    }

    var client = new XMLHttpRequest();
    client.open("put", "/api/now/table/sys_attachment/" + sysID);
    client.setRequestHeader('Accept', 'application/json');
    client.setRequestHeader('Content-Type', 'application/json');
    if (typeof g_ck != 'undefined')
        client.setRequestHeader('X-UserToken', g_ck);

    client.onreadystatechange = function () {
        if (this.readyState == this.DONE) {
            if (this.status == 200)
                document.getElementById("divRenamed").innerHTML = " Filename saved!";
            else
                document.getElementById("divRenamed").innerHTML = this.status + this.response;
        }
    };
    client.send(JSON.stringify(requestBody));


}

function getListV3Fields() {
    try {
        //g_list.filter,g_list.tableName,g_list.sortBy,g_list.sortDir,g_list.,g_list.fields

        if (document.getElementsByClassName('list-container').length == 0) return false;
        if (document.getElementById('related_lists_wrapper') != null) return false; //not on form with related lists

        var ang = angular.element('.list-container').scope().$parent.$parent;


        for (var i = 0; i < ang.data.columns.length; i++) {
            fields.push(ang.data.columns[i].name);
        }
        g_list = {
            "filter": ang.queryString,
            "tableName": ang.table,
            "sortBy": ang.data.filterWidgetConfig.sort[0].column_name,
            "sortDir": ang.data.filterWidgetConfig.sort[0].ascending ? "ASC" : "DESC",
            "rowsPerPage": ang.parameters.sysparm_limit,
            "fields": fields.toString()

        };

        //dbl click to view and update filter condition
        jQuery('div.breadcrumb-container').on("dblclick", function (event) {
            var qry = angular.element('.list-container').scope().$parent.$parent.queryString;
            var newValue = prompt('Filter condition:', qry);
            if (newValue !== qry && newValue !== null) {
                var qry = angular.element('.list-container').scope().$parent.$parent.queryString = newValue || '';
                setTimeout(function () {
                    angular.element('.list-container').scope().$parent.$parent.updateList();
                }, 300);
            }
        });

    } catch (err) {
        console.log(err);

    }
}

function loadIframe(url) {
    var $iframe = jQuery('#' + iframeId);
    if ($iframe.length) {
        $iframe.attr('src', url);
        return false;
    }
    return true;
}

var elNames = '';

function getFormElementNames() {
    if (typeof g_form !== 'undefined') {
        var elArr = []
        for (i = 0; i < g_form.elements.length; i++) {
            elArr.push(g_form.elements[i].fieldName);
        }
        elNames = (elArr.toString());
    }

}
getFormElementNames();

// if (typeof g_form !== 'undefined') {
//     // The ID of the extension we want to talk to.
//     //var chUtilsId = "pebbidlifabkglkbebloodgglcpcljgb"; //dev
//     var chUtilsId = "jgaodbdddndbaijmcljdbglhpdhnjobg"; //prod

//     // Make a simple request:
//     chrome.runtime.sendMessage(chUtilsId, { "table": g_form.tableName, "g_ck": g_ck },
//         function (response) {
//             console.log(response)
//         });
// }



//Query ServiceNow for tables and set to chrome storage
function setUpdateSetTables() {

    var myurl = "/api/now/table/sys_dictionary?sysparm_fields=name&sysparm_query=" +
        "name=javascript:new PAUtils().getTableDecendants('sys_metadata')^internal_type=collection^attributesNOT LIKEupdate_synch=false^NQattributesLIKEupdate_synch=true";
    loadXMLDoc(g_ck, myurl, null, function (jsn) {

        var tbls = [];
        for (var t in jsn.result) {
            if (jsn.result[t].name.length > 1)
                tbls.push(jsn.result[t].name);
        }
        localStorage.setItem("updatesettables", JSON.stringify(tbls));
        //updateSetTables = tbls;
    });
}

//Function to query Servicenow API
function loadXMLDoc(token, url, post, callback) {
    try {
        var hdrs = {
            'Cache-Control': 'no-cache',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

        if (token) //only for instances with high security plugin enabled
            hdrs['X-UserToken'] = token;

        var method = "GET";
        if (post) method = "PUT";

        jQuery.ajax({
            url: url,
            method: method,
            data: post,
            headers: hdrs
        }).done(function (rspns) {
            callback(rspns);
        }).fail(function (jqXHR, textStatus) {
            showAlert('Server Request failed (' + jqXHR.statusText + ')', 'danger');
            callback(textStatus);
        });
    } catch (error) {
        showAlert('Server Request failed (' + error + ')', 'danger');
    }
};

/**
 * @function showAlert
 * @param  {String} msg  {Message to show}
 * @param  {String} type {types: success, info, warning, danger (defaults to 'info')}
 * @param  {Integer} timeout {time to close the flash message in ms (defaults to '3000')}
 * @return {undefined}
 */
function showAlert(msg, type, timeout) {
    msg = 'ServiceNow Utils (Chrome Extension): ' + msg;
    if (typeof type == 'undefined') type = 'info';
    if (typeof timeout == 'undefined') timeout = 3000;
    jQuery('header .service-now-util-alert>div>span').html(msg);
    jQuery('header .service-now-util-alert').addClass('visible');
    jQuery('header .service-now-util-alert>.notification').addClass('notification-' + type);
    setTimeout(function () {
        jQuery('header .service-now-util-alert').removeClass('visible');
        jQuery('header .service-now-util-alert>.notification').removeClass('notification-' + type);
    }, timeout)
}


function getStepDetails(step) {
    var steps = {
        "071ee5b253331200040729cac2dc348d": {
            "step": "Impersonate a user",
            "return": {
                "user": "inputs.var__m_atf_input_variable_071ee5b253331200040729cac2dc348d.user"
            }
        },
        "05317cd10b10220050192f15d6673af8": {
            "step": "Open a form",
            "input": {
                "table": "inputs.var__m_atf_input_variable_05317cd10b10220050192f15d6673af8.table"
            },
            "return": {
                "view": "inputs.var__m_atf_input_variable_05317cd10b10220050192f15d6673af8.view"
            }
        },
        "fcae4a935332120028bc29cac2dc340e": {
            "step": "Set field values",
            "input": {
                "table": "inputs.var__m_atf_input_variable_fcae4a935332120028bc29cac2dc340e.table"
            },
            "return": {
                "field_values": "inputs.var__m_atf_input_variable_fcae4a935332120028bc29cac2dc340e.field_values"
            }
        },
        "1b97cd31872022008182c9ded0e3ece5": {
            "step": "Field Values Validation",
            "input": {
                "table": "inputs.var__m_atf_input_variable_1b97cd31872022008182c9ded0e3ece5.table"
            },
            "return": {
                "conditions": "inputs.var__m_atf_input_variable_1b97cd31872022008182c9ded0e3ece5.conditions"
            }
        },
        "1dfece935332120028bc29cac2dc3478": {
            "step": "Field State Validation",
            "input": {
                "table": "inputs.var__m_atf_input_variable_1dfece935332120028bc29cac2dc3478.table"
            },
            "return": {
                "visible": "inputs.var__m_atf_input_variable_1dfece935332120028bc29cac2dc3478.visible",
                "not_visible": "inputs.var__m_atf_input_variable_1dfece935332120028bc29cac2dc3478.not_visible",
                "read_only": "inputs.var__m_atf_input_variable_1dfece935332120028bc29cac2dc3478.read_only",
                "not_read_only": "inputs.var__m_atf_input_variable_1dfece935332120028bc29cac2dc3478.not_read_only",
                "mandatory": "inputs.var__m_atf_input_variable_1dfece935332120028bc29cac2dc3478.mandatory",
                "not_mandatory": "inputs.var__m_atf_input_variable_1dfece935332120028bc29cac2dc3478.not_mandatory"
            }
        },
        "d8fdf5e10b1022009cfdc71437673adc": {
            "step": "UI Action Visibility",
            "input": {
                "table": "inputs.var__m_atf_input_variable_d8fdf5e10b1022009cfdc71437673adc.table"
            },
            "return": {
                "visible": "inputs.var__m_atf_input_variable_d8fdf5e10b1022009cfdc71437673adc.visible",
                "not_visible": "inputs.var__m_atf_input_variable_d8fdf5e10b1022009cfdc71437673adc.not_visible"
            }
        },
        "0f4a128297202200abe4bb7503ac4af0": {
            "step": "Click UI action",
            "input": {
                "table": "inputs.var__m_atf_input_variable_0f4a128297202200abe4bb7503ac4af0.table"
            },
            "return": {
                "ui_action": "inputs.var__m_atf_input_variable_0f4a128297202200abe4bb7503ac4af0.ui_action",
                "assert_type": "inputs.var__m_atf_input_variable_0f4a128297202200abe4bb7503ac4af0.assert_type"
            }
        },
        "be8e0a935332120028bc29cac2dc34e4": {
            "step": "Submit a form",
            "input": {
                "table": ""
            },
            "return": {
                "assert_type": "inputs.var__m_atf_input_variable_be8e0a935332120028bc29cac2dc34e4.assert_type"
            }
        }
    }

    return steps[step];
}