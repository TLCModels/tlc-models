#!/usr/bin/env python
"""
Push complete workflow configurations to n8n via REST API.
Updates all 9 TLC Models workflows with real parameters and connections.
"""
import json
import os
import ssl
import urllib.request
import urllib.error

N8N_URL = "https://anthonyt.app.n8n.cloud"
N8N_API_KEY = os.environ.get("N8N_API_KEY", "")

# Disable SSL verification for local dev
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE


def api_get(path):
    req = urllib.request.Request(f"{N8N_URL}/api/v1{path}", headers={"X-N8N-API-KEY": N8N_API_KEY})
    with urllib.request.urlopen(req, context=ctx) as resp:
        return json.loads(resp.read())


def api_put(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(f"{N8N_URL}/api/v1{path}", data=body, method="PUT",
                                 headers={"X-N8N-API-KEY": N8N_API_KEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, context=ctx) as resp:
        return json.loads(resp.read())


# Workflow parameter configs keyed by workflow name prefix
WORKFLOW_PARAMS = {
    "TLC 4.2": {
        "Formspree Lead Webhook": {
            "httpMethod": "POST", "path": "tlc-lead-enrichment",
            "responseMode": "lastNode", "options": {}
        },
        "Parse Formspree Payload": {
            "mode": "runOnceForAllItems", "language": "javaScript",
            "jsCode": "const body = $input.first().json.body || $input.first().json;\nreturn [{ json: {\n  name: body.name || '', email: body.email || body._replyto || '',\n  phone: body.phone || '', company: body.company || '',\n  eventType: body.event_type || '', eventDate: body.event_date || '',\n  city: body.city || '', talentNeeded: parseInt(body.talent_needed) || 0,\n  budgetRange: body.budget_range || '', message: body.message || '',\n  source: body._form_name || 'website', timestamp: new Date().toISOString()\n}}];"
        },
        "Clearbit Enrichment": {
            "method": "GET",
            "url": "={{ \"https://person.clearbit.com/v2/people/find?email=\" + $json.email }}",
            "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
            "sendHeaders": False, "sendQuery": False, "sendBody": False,
            "options": {"response": {"response": {"neverError": True}}}
        },
        "Lead Scoring Engine": {
            "mode": "runOnceForAllItems", "language": "javaScript",
            "jsCode": "const lead = $('Parse Formspree Payload').first().json;\nconst enrichment = $input.first().json || {};\nlet score = 0;\nconst budget = lead.budgetRange || '';\nif (budget.includes('50k+') || budget.includes('100k')) score += 40;\nelse if (budget.includes('25k')) score += 30;\nelse if (budget.includes('10k')) score += 20;\nelse score += 10;\nconst eventType = (lead.eventType || '').toLowerCase();\nif (eventType.includes('f1') || eventType.includes('fifa')) score += 30;\nelse if (eventType.includes('corporate') || eventType.includes('trade')) score += 20;\nelse score += 10;\nif (lead.talentNeeded >= 20) score += 20;\nelse if (lead.talentNeeded >= 10) score += 15;\nelse score += 5;\nif (enrichment.company && enrichment.company.metrics) {\n  if ((enrichment.company.metrics.employees || 0) > 500) score += 10;\n}\nreturn [{ json: { ...lead, score, isVIP: score >= 70, enrichment: { company: enrichment.company?.name, title: enrichment.title } } }];"
        },
        "VIP Check": {
            "conditions": {
                "options": {"caseSensitive": True, "leftValue": ""},
                "conditions": [{"id": "vip", "leftValue": "={{ $json.isVIP }}", "rightValue": True,
                                "operator": {"type": "boolean", "operation": "true"}}]
            }
        },
        "Twilio SMS to CEO": {
            "from": "={{ $env.TWILIO_PHONE }}", "to": "={{ $env.CEO_PHONE }}",
            "message": "={{ \"VIP LEAD (Score: \" + $json.score + \")\\n\" + $json.name + \" - \" + $json.company + \"\\nEvent: \" + $json.eventType + \"\\nBudget: \" + $json.budgetRange }}"
        },
        "Slack VIP Alert": {
            "method": "POST", "url": "={{ $env.SLACK_WEBHOOK_URL }}",
            "sendBody": True, "contentType": "json", "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify({text: \"VIP Lead: \" + $json.name + \" (\" + $json.company + \") Score: \" + $json.score}) }}",
            "authentication": "none", "sendHeaders": False, "sendQuery": False
        },
        "OpenAI Generate Email": {
            "method": "POST", "url": "https://api.openai.com/v1/chat/completions",
            "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
            "sendBody": True, "contentType": "json", "specifyBody": "json",
            "jsonBody": "={{ JSON.stringify({model:\"gpt-4o-mini\",messages:[{role:\"system\",content:\"You are a sales rep for TLC Models, an elite talent staffing agency. Write a personalized follow-up email. Be warm, professional. Under 200 words.\"},{role:\"user\",content:\"Lead: \"+$json.name+\", Company: \"+$json.company+\", Event: \"+$json.eventType+\", Budget: \"+$json.budgetRange}],temperature:0.7,max_tokens:500}) }}",
            "sendHeaders": False, "sendQuery": False
        },
        "Parse AI Email": {
            "mode": "runOnceForAllItems", "language": "javaScript",
            "jsCode": "const ai = $input.first().json;\nconst lead = $('Lead Scoring Engine').first().json;\nconst body = ai.choices?.[0]?.message?.content || 'Thank you for your interest in TLC Models.';\nreturn [{json:{...lead, emailBody: body, subject: 'TLC Models - Your '+lead.eventType+' Staffing Inquiry'}}];"
        },
        "Gmail Send Follow-up": {
            "sendTo": "={{ $json.email }}", "subject": "={{ $json.subject }}",
            "message": "={{ $json.emailBody }}",
            "options": {"senderName": "TLC Models", "replyTo": "info@tlcmodels.com"}
        }
    }
}

# Also define params for other workflows
WORKFLOW_PARAMS["TLC 4.3"] = {
    "HubSpot Deal Webhook": {"httpMethod": "POST", "path": "tlc-proposal-generator", "responseMode": "lastNode", "options": {}},
    "Parse Deal Data": {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": "const deal = $input.first().json.body || $input.first().json;\nreturn [{json:{dealId:deal.dealId||'',clientName:deal.clientName||'',clientEmail:deal.clientEmail||'',eventType:deal.eventType||'',eventDate:deal.eventDate||'',location:deal.location||'',talentCount:deal.talentCount||0,budget:deal.budget||'',requirements:deal.requirements||''}}];"},
    "OpenAI Generate Proposal": {"method": "POST", "url": "https://api.openai.com/v1/chat/completions", "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({model:'gpt-4o-mini',messages:[{role:'system',content:'Generate a professional event staffing proposal for TLC Models. Include: executive summary, recommended talent breakdown, pricing estimate, timeline, and terms. Format as HTML.'},{role:'user',content:'Client: '+$json.clientName+', Event: '+$json.eventType+' in '+$json.location+' on '+$json.eventDate+', Talent needed: '+$json.talentCount+', Budget: '+$json.budget+', Requirements: '+$json.requirements}],temperature:0.7,max_tokens:2000}) }}", "sendHeaders": False, "sendQuery": False},
    "Format HTML Proposal": {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": "const ai=$input.first().json;\nconst deal=$('Parse Deal Data').first().json;\nconst html=ai.choices?.[0]?.message?.content||'<h1>Proposal</h1>';\nreturn [{json:{...deal,proposalHtml:html,fileName:'TLC-Proposal-'+deal.clientName.replace(/\\s/g,'-')+'.html'}}];"},
    "Upload to S3": {"method": "PUT", "url": "={{ 'https://tlc-models-media.s3.us-east-2.amazonaws.com/proposals/' + $json.fileName }}", "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendBody": True, "contentType": "raw", "body": "={{ $json.proposalHtml }}", "sendHeaders": True, "specifyHeaders": "keypair", "headerParameters": {"parameters": [{"name": "Content-Type", "value": "text/html"}]}, "sendQuery": False},
    "Gmail Send Proposal": {"sendTo": "={{ $json.clientEmail }}", "subject": "={{ 'TLC Models Proposal - ' + $json.eventType + ' Staffing' }}", "message": "={{ $json.proposalHtml }}", "options": {"senderName": "TLC Models Proposals"}},
    "Update HubSpot Deal Stage": {"method": "PATCH", "url": "={{ 'https://api.hubapi.com/crm/v3/objects/deals/' + $json.dealId }}", "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({properties:{dealstage:'proposalsent'}}) }}", "sendHeaders": False, "sendQuery": False}
}

WORKFLOW_PARAMS["TLC 4.4"] = {
    "Daily 9AM Schedule": {"rule": {"interval": [{"field": "days", "triggerAtHour": 9, "triggerAtMinute": 0}]}},
    "Read Prospect Sheet": {"method": "GET", "url": "={{ 'https://sheets.googleapis.com/v4/spreadsheets/' + $env.PROSPECT_SHEET_ID + '/values/Prospects!A2:J' }}", "authentication": "genericCredentialType", "genericAuthType": "oAuth2Api", "sendHeaders": False, "sendQuery": False, "sendBody": False},
    "Split Prospects": {"batchSize": 1},
    "Personalize with OpenAI": {"method": "POST", "url": "https://api.openai.com/v1/chat/completions", "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({model:'gpt-4o-mini',messages:[{role:'system',content:'Write a brief, personalized outreach message for an F1/FIFA event director. Mention their specific role and how TLC Models can help staff their event. Keep under 100 words.'},{role:'user',content:'Name: '+$json.name+', Title: '+$json.title+', Company: '+$json.company+', Event: '+$json.targetEvent}],temperature:0.8,max_tokens:200}) }}", "sendHeaders": False, "sendQuery": False},
    "Email or LinkedIn Check": {"conditions": {"conditions": [{"leftValue": "={{ $json.touchNumber % 2 }}", "rightValue": 1, "operator": {"type": "number", "operation": "equals"}}]}},
    "Gmail Outreach": {"sendTo": "={{ $json.email }}", "subject": "={{ 'Partnership Opportunity - ' + $json.targetEvent }}", "message": "={{ $input.first().json.choices[0].message.content }}", "options": {"senderName": "Anthony Turturro - TLC Models"}},
    "Apollo LinkedIn Touch": {"method": "POST", "url": "https://api.apollo.io/v1/emailer/campaigns/add_contact_to_campaign", "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({contact_email:$json.email,campaign_id:$env.APOLLO_CAMPAIGN_ID}) }}", "sendHeaders": False, "sendQuery": False},
    "Update Sheet Status": {"method": "PUT", "url": "={{ 'https://sheets.googleapis.com/v4/spreadsheets/' + $env.PROSPECT_SHEET_ID + '/values/Prospects!K' + $json.rowIndex + ':L' + $json.rowIndex + '?valueInputOption=USER_ENTERED' }}", "authentication": "genericCredentialType", "genericAuthType": "oAuth2Api", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({values:[[new Date().toISOString(), 'Touch '+$json.touchNumber+' sent']]}) }}", "sendHeaders": False, "sendQuery": False}
}

WORKFLOW_PARAMS["TLC 4.5"] = {
    "SEO Webhook": {"httpMethod": "POST", "path": "tlc-seo-generator", "responseMode": "responseNode", "options": {}},
    "Parse Keyword Data": {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": "const body=$input.first().json.body||$input.first().json;\nreturn [{json:{keyword:body.keyword||'',city:body.city||'',slug:(body.keyword||'').toLowerCase().replace(/[^a-z0-9]+/g,'-'),template:body.template||'service-page'}}];"},
    "OpenAI Generate Article": {"method": "POST", "url": "https://api.openai.com/v1/chat/completions", "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({model:'gpt-4o-mini',messages:[{role:'system',content:'Write a 1000-word SEO-optimized article for TLC Models, a talent staffing agency. Include H2 headings, bullet points, a FAQ section with 3 questions, and a call to action. Natural keyword density. Professional tone.'},{role:'user',content:'Target keyword: '+$json.keyword+' in '+$json.city+'. Focus on event staffing services.'}],temperature:0.7,max_tokens:2000}) }}", "sendHeaders": False, "sendQuery": False},
    "Format as Webflow CMS": {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": "const ai=$input.first().json;\nconst kw=$('Parse Keyword Data').first().json;\nconst content=ai.choices?.[0]?.message?.content||'';\nreturn [{json:{name:kw.keyword+' in '+kw.city+' | TLC Models',slug:kw.slug+'-'+kw.city.toLowerCase().replace(/\\s/g,'-'),content:content,metaTitle:kw.keyword+' in '+kw.city+' - TLC Models',metaDescription:'Professional '+kw.keyword+' services in '+kw.city+'. TLC Models provides elite talent for events. Book now.',city:kw.city}}];"},
    "Publish to Webflow": {"method": "POST", "url": "={{ 'https://api.webflow.com/v2/collections/' + $env.WEBFLOW_COLLECTION_ID + '/items' }}", "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({fieldData:{name:$json.name,slug:$json.slug,'post-body':$json.content,'meta-title':$json.metaTitle,'meta-description':$json.metaDescription}}) }}", "sendHeaders": False, "sendQuery": False},
    "Ping Google Indexing": {"method": "POST", "url": "https://indexing.googleapis.com/v3/urlNotifications:publish", "authentication": "genericCredentialType", "genericAuthType": "oAuth2Api", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({url:'https://www.tlcmodels.com/blog/'+$json.slug,type:'URL_UPDATED'}) }}", "sendHeaders": False, "sendQuery": False},
    "Respond with Page URL": {"respondWith": "json", "responseBody": "={{ JSON.stringify({success:true,url:'https://www.tlcmodels.com/blog/'+$('Format as Webflow CMS').first().json.slug}) }}"}
}

WORKFLOW_PARAMS["TLC 4.6"] = {
    "Typeform Submission Webhook": {"httpMethod": "POST", "path": "tlc-talent-onboarding", "responseMode": "lastNode", "options": {}},
    "Parse Application": {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": "const body=$input.first().json.body||$input.first().json;\nreturn [{json:{name:body.name||'',email:body.email||'',phone:body.phone||'',city:body.city||'',experience:body.experience||'',specialties:body.specialties||'',photoUrl:body.photo_url||'',height:body.height||'',availability:body.availability||'',instagram:body.instagram||''}}];"},
    "Evaluate Application": {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": "const app=$input.first().json;\nlet score=0;\nif(app.experience&&app.experience!=='none')score+=20;\nif(app.photoUrl)score+=30;\nif(app.phone)score+=10;\nif(app.city)score+=10;\nif(app.specialties)score+=15;\nif(app.instagram)score+=5;\nif(app.availability&&app.availability!=='unavailable')score+=10;\nreturn [{json:{...app,qualificationScore:score,qualified:score>=40}}];"},
    "Qualified Check": {"conditions": {"conditions": [{"leftValue": "={{ $json.qualified }}", "rightValue": True, "operator": {"type": "boolean", "operation": "true"}}]}},
    "Create Calendly Link": {"method": "POST", "url": "https://api.calendly.com/scheduling_links", "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({max_event_count:1,owner:'https://api.calendly.com/event_types/'+$env.CALENDLY_INTERVIEW_EVENT_TYPE,owner_type:'EventType'}) }}", "sendHeaders": False, "sendQuery": False},
    "Gmail Interview Invite": {"sendTo": "={{ $json.email }}", "subject": "TLC Models - Interview Invitation", "message": "={{ 'Hi '+$json.name+',\\n\\nThank you for applying to TLC Models! We reviewed your application and would love to schedule an interview.\\n\\nPlease book your interview here: '+$input.first().json.resource?.booking_url+'\\n\\nBest,\\nTLC Models Talent Team' }}", "options": {"senderName": "TLC Models Talent"}},
    "Gmail Rejection": {"sendTo": "={{ $json.email }}", "subject": "TLC Models - Application Update", "message": "={{ 'Hi '+$json.name+',\\n\\nThank you for your interest in TLC Models. After reviewing your application, we are unable to move forward at this time. We encourage you to reapply in the future with updated photos and experience.\\n\\nBest,\\nTLC Models' }}", "options": {"senderName": "TLC Models Talent"}}
}

WORKFLOW_PARAMS["TLC 4.7"] = {
    "Photo Submission Webhook": {"httpMethod": "POST", "path": "tlc-profile-updater", "responseMode": "lastNode", "options": {}},
    "Parse Submission": {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": "const body=$input.first().json.body||$input.first().json;\nreturn [{json:{talentId:body.talent_id||'',photoUrl:body.photo_url||'',name:body.name||'',category:body.category||'headshot'}}];"},
    "Download Photo": {"method": "GET", "url": "={{ $json.photoUrl }}", "authentication": "none", "sendHeaders": False, "sendQuery": False, "sendBody": False, "options": {"response": {"response": {"responseFormat": "file", "outputPropertyName": "photo"}}}},
    "Generate SEO Filename": {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": "const data=$('Parse Submission').first().json;\nconst slug=data.name.toLowerCase().replace(/[^a-z0-9]+/g,'-');\nconst filename='tlc-models-'+slug+'-'+data.category+'-'+Date.now()+'.webp';\nreturn [{json:{...data,filename,uploadPath:data.category+'/'+filename}}];"},
    "Cloudinary Upload": {"method": "POST", "url": "={{ 'https://api.cloudinary.com/v1_1/'+$env.CLOUDINARY_CLOUD+'/image/upload' }}", "authentication": "none", "sendBody": True, "contentType": "multipart-form-data", "specifyBody": "keypair", "bodyParameters": {"parameters": [{"name": "file", "value": "={{ $json.photoUrl }}"}, {"name": "upload_preset", "value": "tlc_talent"}, {"name": "public_id", "value": "={{ $json.filename.replace('.webp','') }}"}, {"name": "transformation", "value": "w_1920,h_1080,c_fill,f_webp,q_80"}]}, "sendHeaders": False, "sendQuery": False},
    "Update Airtable Profile": {"method": "PATCH", "url": "={{ 'https://api.airtable.com/v0/'+$env.AIRTABLE_BASE_ID+'/Talent/'+$json.talentId }}", "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({fields:{HeadshotURL:$('Cloudinary Upload').first().json.secure_url,LastUpdated:new Date().toISOString()}}) }}", "sendHeaders": False, "sendQuery": False},
    "Refresh Webflow CMS": {"method": "PATCH", "url": "={{ 'https://api.webflow.com/v2/collections/'+$env.WEBFLOW_TALENT_COLLECTION+'/items/'+$json.webflowItemId }}", "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({fieldData:{'headshot-url':$('Cloudinary Upload').first().json.secure_url}}) }}", "sendHeaders": False, "sendQuery": False}
}

WORKFLOW_PARAMS["TLC 4.8"] = {
    "Daily 7AM Schedule": {"rule": {"interval": [{"field": "days", "triggerAtHour": 7, "triggerAtMinute": 0}]}},
    "Meta Ads API": {"method": "GET", "url": "={{ 'https://graph.facebook.com/v19.0/act_'+$env.META_AD_ACCOUNT+'/insights?fields=campaign_name,impressions,clicks,spend,actions&date_preset=yesterday' }}", "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendHeaders": False, "sendQuery": False, "sendBody": False},
    "Google Ads API": {"method": "POST", "url": "https://googleads.googleapis.com/v16/customers/{{ $env.GOOGLE_ADS_CUSTOMER_ID }}/googleAds:searchStream", "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({query:'SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM campaign WHERE segments.date = YESTERDAY'}) }}", "sendHeaders": True, "specifyHeaders": "keypair", "headerParameters": {"parameters": [{"name": "developer-token", "value": "={{ $env.GOOGLE_ADS_DEV_TOKEN }}"}, {"name": "login-customer-id", "value": "={{ $env.GOOGLE_ADS_CUSTOMER_ID }}"}]}, "sendQuery": False},
    "Consolidate KPIs": {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": "const meta=$('Meta Ads API').first().json.data||[];\nconst gads=$('Google Ads API').first().json.results||[];\nconst metaSpend=meta.reduce((s,c)=>s+parseFloat(c.spend||0),0);\nconst metaClicks=meta.reduce((s,c)=>s+parseInt(c.clicks||0),0);\nconst metaLeads=meta.reduce((s,c)=>s+(c.actions||[]).filter(a=>a.action_type==='lead').reduce((s2,a)=>s2+parseInt(a.value||0),0),0);\nconst gadsSpend=gads.reduce((s,r)=>s+(r.campaign?.metrics?.costMicros||0)/1e6,0);\nconst gadsClicks=gads.reduce((s,r)=>s+parseInt(r.campaign?.metrics?.clicks||0),0);\nconst totalSpend=metaSpend+gadsSpend;\nconst totalClicks=metaClicks+gadsClicks;\nconst totalLeads=metaLeads;\nreturn [{json:{date:new Date().toISOString().split('T')[0],metaSpend:metaSpend.toFixed(2),gadsSpend:gadsSpend.toFixed(2),totalSpend:totalSpend.toFixed(2),totalClicks,totalLeads,cpc:totalClicks>0?(totalSpend/totalClicks).toFixed(2):'N/A',cpl:totalLeads>0?(totalSpend/totalLeads).toFixed(2):'N/A'}}];"},
    "Log to Google Sheets": {"method": "POST", "url": "={{ 'https://sheets.googleapis.com/v4/spreadsheets/'+$env.AD_DASHBOARD_SHEET+'/values/Dashboard!A:H:append?valueInputOption=USER_ENTERED' }}", "authentication": "genericCredentialType", "genericAuthType": "oAuth2Api", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({values:[[$json.date,$json.metaSpend,$json.gadsSpend,$json.totalSpend,String($json.totalClicks),String($json.totalLeads),$json.cpc,$json.cpl]]}) }}", "sendHeaders": False, "sendQuery": False},
    "Slack Morning Summary": {"method": "POST", "url": "={{ $env.SLACK_WEBHOOK_URL }}", "authentication": "none", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({text:'Ad Performance ('+$json.date+'): Spend $'+$json.totalSpend+' | Clicks: '+$json.totalClicks+' | Leads: '+$json.totalLeads+' | CPC: $'+$json.cpc+' | CPL: $'+$json.cpl}) }}", "sendHeaders": False, "sendQuery": False}
}

WORKFLOW_PARAMS["TLC 4.9"] = {
    "Weekly Monday 6AM": {"rule": {"interval": [{"field": "weeks", "triggerAtDay": [1], "triggerAtHour": 6, "triggerAtMinute": 0}]}},
    "Read Keywords Sheet": {"method": "GET", "url": "={{ 'https://sheets.googleapis.com/v4/spreadsheets/'+$env.KEYWORD_SHEET_ID+'/values/Keywords!A2:B' }}", "authentication": "genericCredentialType", "genericAuthType": "oAuth2Api", "sendHeaders": False, "sendQuery": False, "sendBody": False},
    "Split Keywords": {"batchSize": 10},
    "DataForSEO Volume Lookup": {"method": "POST", "url": "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live", "authentication": "genericCredentialType", "genericAuthType": "httpBasicAuth", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify([{keywords:$json.values.map(r=>r[0]),location_code:2840,language_code:'en'}]) }}", "sendHeaders": False, "sendQuery": False},
    "Parse Volume Results": {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": "const results=$input.first().json.tasks?.[0]?.result||[];\nreturn results.map(r=>({json:{keyword:r.keyword,volume:r.search_volume||0,cpc:r.cpc||0,competition:r.competition||0,competitionLevel:r.competition_level||'',trend:JSON.stringify(r.monthly_searches?.slice(0,6)||[])}}));"},
    "Write Results to Sheet": {"method": "PUT", "url": "={{ 'https://sheets.googleapis.com/v4/spreadsheets/'+$env.KEYWORD_SHEET_ID+'/values/Results!A2:F?valueInputOption=USER_ENTERED' }}", "authentication": "genericCredentialType", "genericAuthType": "oAuth2Api", "sendBody": True, "contentType": "json", "specifyBody": "json", "jsonBody": "={{ JSON.stringify({values:$input.all().map(i=>[i.json.keyword,String(i.json.volume),String(i.json.cpc),String(i.json.competition),i.json.competitionLevel,i.json.trend])}) }}", "sendHeaders": False, "sendQuery": False}
}

WORKFLOW_PARAMS["TLC Mega-Event"] = {
    "Event Booking Webhook": {"httpMethod": "POST", "path": "tlc-booking-engine", "responseMode": "responseNode", "options": {}},
    "Parse Event Details": {"mode": "manual", "assignments": {"assignments": [{"id": "1", "name": "eventType", "value": "={{ $json.body.event_type }}", "type": "string"}, {"id": "2", "name": "location", "value": "={{ $json.body.location }}", "type": "string"}, {"id": "3", "name": "eventDate", "value": "={{ $json.body.event_date }}", "type": "string"}, {"id": "4", "name": "talentCount", "value": "={{ $json.body.talent_count }}", "type": "number"}, {"id": "5", "name": "dressCode", "value": "={{ $json.body.dress_code }}", "type": "string"}, {"id": "6", "name": "clientEmail", "value": "={{ $json.body.client_email }}", "type": "string"}]}, "includeOtherFields": False},
    "Query Airtable Talent DB": {"method": "GET", "url": "={{ 'https://api.airtable.com/v0/'+$env.AIRTABLE_BASE_ID+'/Talent' }}", "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendQuery": True, "specifyQuery": "keypair", "queryParameters": {"parameters": [{"name": "filterByFormula", "value": "={{ \"AND({Location}='\" + $json.location + \"',{Available}=TRUE())\" }}"}]}, "sendHeaders": False, "sendBody": False},
    "Filter by Location & Specialty": {"conditions": {"conditions": [{"leftValue": "={{ $json.records.length }}", "rightValue": 0, "operator": {"type": "number", "operation": "gt"}}]}},
    "Rank Talent by Rating": {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": "const records=$input.first().json.records||[];\nconst count=$('Parse Event Details').first().json.talentCount||10;\nconst scored=records.map(r=>({talentId:r.id,name:r.fields.Name||'',specialty:r.fields.Specialty||'',location:r.fields.Location||'',rating:r.fields.Rating||0,phone:r.fields.Phone||'',email:r.fields.Email||'',photo:r.fields.HeadshotURL||'',score:(r.fields.Rating||0)*10+(r.fields.ExperienceYears||0)}));\nconst ranked=scored.sort((a,b)=>b.score-a.score).slice(0,count);\nreturn ranked.map(t=>({json:t}));"},
    "Respond with Ranked Talent": {"respondWith": "json", "responseBody": "={{ JSON.stringify({success:true,count:$input.all().length,talent:$input.all().map(i=>i.json)}) }}"}
}


def update_workflow(wf_id, wf_name):
    """Fetch workflow, update node parameters, PUT back."""
    wf = api_get(f"/workflows/{wf_id}")

    # Name aliases for newer workflows
    NAME_ALIASES = {
        "TLC Lead Enrichment": "TLC 4.2",
        "TLC Proposal Generator": "TLC 4.3",
        "TLC F1/FIFA Outreach": "TLC 4.4",
        "TLC SEO Page Generator": "TLC 4.5",
        "TLC Talent Onboarding": "TLC 4.6",
        "TLC Talent Profile Updater": "TLC 4.7",
        "TLC Ad Performance": "TLC 4.8",
        "TLC Keyword Volume": "TLC 4.9",
    }

    # Find matching param config
    matched_key = None
    for key in WORKFLOW_PARAMS:
        if wf_name.startswith(key) or key in wf_name:
            matched_key = key
            break
    if not matched_key:
        for alias, target in NAME_ALIASES.items():
            if alias in wf_name:
                matched_key = target
                break

    if not matched_key:
        print(f"  SKIP: No config for '{wf_name}'")
        return False

    params = WORKFLOW_PARAMS[matched_key]
    updated = 0

    for node in wf["nodes"]:
        if node["name"] in params:
            node["parameters"] = params[node["name"]]
            updated += 1

    if updated == 0:
        print(f"  SKIP: No matching nodes for '{wf_name}'")
        return False

    # Keep only writable fields for PUT (strict schema)
    allowed = {"name", "nodes", "connections", "settings"}
    wf = {k: v for k, v in wf.items() if k in allowed}
    if "settings" not in wf:
        wf["settings"] = {"executionOrder": "v1"}

    try:
        result = api_put(f"/workflows/{wf_id}", wf)
        print(f"  OK: Updated {updated} nodes in '{wf_name}'")
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"  ERROR: {e.code} - {body[:200]}")
        return False


def main():
    if not N8N_API_KEY:
        print("ERROR: Set N8N_API_KEY environment variable")
        return

    # Get all workflows
    all_wf = api_get("/workflows?limit=50")
    workflows = all_wf.get("data", [])

    print(f"Found {len(workflows)} workflows\n")

    success = 0
    for wf in workflows:
        if wf.get("isArchived"):
            continue
        wf_id = wf["id"]
        wf_name = wf["name"]
        if "TLC" not in wf_name:
            continue
        print(f"Processing: {wf_name} ({wf_id})")
        if update_workflow(wf_id, wf_name):
            success += 1

    print(f"\nDone: {success} workflows updated")


if __name__ == "__main__":
    main()
