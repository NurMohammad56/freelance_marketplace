import json

BASE = "{{baseUrl}}"
SERVER = "{{serverUrl}}"


def url_obj(raw):
    if raw.startswith(SERVER):
        host = [SERVER]
        path = raw[len(SERVER):]
    else:
        host = [BASE]
        path = raw[len(BASE):]
    path = path.lstrip("/")
    path_parts = path.split("/") if path else [""]
    return {"raw": raw, "host": host, "path": path_parts}


def bearer_auth():
    return {
        "type": "bearer",
        "bearer": [{"key": "token", "value": "{{accessToken}}", "type": "string"}],
    }


def json_body(data):
    return {
        "mode": "raw",
        "raw": json.dumps(data, indent=2),
        "options": {"raw": {"language": "json"}},
    }


def form_body(fields):
    return {"mode": "formdata", "formdata": fields}


def req(method, path, auth=False, body=None):
    r = {"method": method, "url": url_obj(path)}
    if auth:
        r["auth"] = bearer_auth()
    if body is not None:
        r["body"] = body
    return r


def form_text(key, value=""):
    return {"key": key, "value": value, "type": "text"}


def form_file(key):
    return {"key": key, "type": "file", "src": ""}


folders = []

folders.append(
    {
        "name": "Misc",
        "item": [
            {"name": "Root Ping (Public)", "request": req("GET", f"{SERVER}/")},
            {"name": "Health Check (Public)", "request": req("GET", f"{BASE}/health")},
        ],
    }
)
folders.append(
    {
        "name": "Auth",
        "item": [
            {
                "name": "Register (Public)",
                "request": req(
                    "POST",
                    f"{BASE}/auth/register",
                    body=json_body(
                        {
                            "role": "client",
                            "name": "John Doe",
                            "email": "john@example.com",
                            "password": "Password123!",
                            "phone": "+1234567890",
                        }
                    ),
                ),
            },
            {
                "name": "Login (Public)",
                "request": req(
                    "POST",
                    f"{BASE}/auth/login",
                    body=json_body({"email": "john@example.com", "password": "Password123!"}),
                ),
            },
            {
                "name": "Refresh Token (Public)",
                "request": req(
                    "POST",
                    f"{BASE}/auth/refresh-token",
                    body=json_body({"refreshToken": "REFRESH_TOKEN"}),
                ),
            },
            {
                "name": "Forgot Password (Public)",
                "request": req(
                    "POST",
                    f"{BASE}/auth/forgot-password",
                    body=json_body({"email": "john@example.com"}),
                ),
            },
            {
                "name": "Reset Password (Public)",
                "request": req(
                    "POST",
                    f"{BASE}/auth/reset-password",
                    body=json_body({"token": "RESET_TOKEN", "newPassword": "NewPassword123!"}),
                ),
            },
            {
                "name": "Verify Email (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/auth/verify-email",
                    auth=True,
                    body=json_body({"otp": "123456"}),
                ),
            },
            {
                "name": "Resend OTP (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/auth/resend-otp",
                    auth=True,
                    body=json_body({}),
                ),
            },
            {
                "name": "Logout (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/auth/logout",
                    auth=True,
                    body=json_body({}),
                ),
            },
            {
                "name": "Change Password (Auth)",
                "request": req(
                    "PUT",
                    f"{BASE}/auth/change-password",
                    auth=True,
                    body=json_body({"currentPassword": "Password123!", "newPassword": "NewPassword123!"}),
                ),
            },
        ],
    }
)

folders.append(
    {
        "name": "Users",
        "item": [
            {"name": "Search Users (Public)", "request": req("GET", f"{BASE}/users/search")},
            {"name": "Nearby Users (Public)", "request": req("GET", f"{BASE}/users/nearby")},
            {"name": "Get User By Id (Public)", "request": req("GET", f"{BASE}/users/:userId")},
            {"name": "Get My Profile (Auth)", "request": req("GET", f"{BASE}/users/profile/me", auth=True)},
            {
                "name": "Update Profile (Auth)",
                "request": req(
                    "PUT",
                    f"{BASE}/users/profile",
                    auth=True,
                    body=form_body(
                        [
                            form_text("name", "John Doe"),
                            form_text("phone", "+1234567890"),
                            form_text("address", "Cape Town"),
                            form_text("bio", "Short bio"),
                            form_file("avatar"),
                        ]
                    ),
                ),
            },
            {
                "name": "Add Work (Creative)",
                "request": req(
                    "POST",
                    f"{BASE}/users/works",
                    auth=True,
                    body=form_body([form_text("title", "Brand Photoshoot"), form_file("workImages")]),
                ),
            },
            {"name": "Delete Work (Creative)", "request": req("DELETE", f"{BASE}/users/works/:workId", auth=True)},
            {
                "name": "Add Project (Client)",
                "request": req(
                    "POST",
                    f"{BASE}/users/projects",
                    auth=True,
                    body=form_body([form_text("title", "Product Launch"), form_file("images"), form_file("videos")]),
                ),
            },
            {"name": "Delete Project (Client)", "request": req("DELETE", f"{BASE}/users/projects/:projectId", auth=True)},
            {
                "name": "Update Settings (Auth)",
                "request": req(
                    "PUT",
                    f"{BASE}/users/settings",
                    auth=True,
                    body=json_body({"emailNotifications": True, "pushNotifications": True, "chatNotifications": True}),
                ),
            },
            {
                "name": "Delete Account (Auth)",
                "request": req(
                    "DELETE",
                    f"{BASE}/users/account",
                    auth=True,
                    body=json_body({"reason": "No longer needed"}),
                ),
            },
        ],
    }
)
folders.append(
    {
        "name": "Gigs",
        "item": [
            {"name": "Get All Gigs (Public)", "request": req("GET", f"{BASE}/gigs")},
            {"name": "Get Top Rated Gigs (Public)", "request": req("GET", f"{BASE}/gigs/top-rated")},
            {"name": "Get Gigs By Creative (Public)", "request": req("GET", f"{BASE}/gigs/creative/:creativeId")},
            {"name": "Get Gig By Id (Public)", "request": req("GET", f"{BASE}/gigs/:gigId")},
            {
                "name": "Create Gig (Creative)",
                "request": req(
                    "POST",
                    f"{BASE}/gigs",
                    auth=True,
                    body=form_body(
                        [
                            form_text("title", "Wedding Photography"),
                            form_text("description", "Full-day coverage"),
                            form_text("price", "1500"),
                            form_text("categoryId", "CATEGORY_ID"),
                            form_text("deliveryTime", "7"),
                            form_file("images"),
                            form_file("reels"),
                        ]
                    ),
                ),
            },
            {"name": "Get My Gigs (Creative)", "request": req("GET", f"{BASE}/gigs/my/gigs", auth=True)},
            {
                "name": "Update Gig (Creative)",
                "request": req(
                    "PUT",
                    f"{BASE}/gigs/:gigId",
                    auth=True,
                    body=form_body(
                        [
                            form_text("title", "Wedding Photography"),
                            form_text("description", "Updated description"),
                            form_text("price", "1600"),
                            form_text("deliveryTime", "5"),
                            form_file("images"),
                            form_file("reels"),
                        ]
                    ),
                ),
            },
            {
                "name": "Toggle Gig Active (Creative)",
                "request": req(
                    "PATCH",
                    f"{BASE}/gigs/:gigId/toggle-active",
                    auth=True,
                    body=json_body({"isActive": True}),
                ),
            },
            {"name": "Delete Gig (Creative)", "request": req("DELETE", f"{BASE}/gigs/:gigId", auth=True)},
        ],
    }
)

folders.append(
    {
        "name": "Job Posts",
        "item": [
            {"name": "Get All Job Posts (Public)", "request": req("GET", f"{BASE}/job-posts")},
            {"name": "Get Job Post By Id (Public)", "request": req("GET", f"{BASE}/job-posts/:jobPostId")},
            {
                "name": "Apply To Job Post (Creative)",
                "request": req(
                    "POST",
                    f"{BASE}/job-posts/:jobPostId/apply",
                    auth=True,
                    body=json_body({"coverLetter": "I can do this", "proposedBudget": 1200}),
                ),
            },
            {
                "name": "Create Job Post (Client)",
                "request": req(
                    "POST",
                    f"{BASE}/job-posts",
                    auth=True,
                    body=form_body(
                        [
                            form_text("title", "Brand Campaign"),
                            form_text("description", "Need social media photos"),
                            form_text("budget", "1000"),
                            form_text("categoryId", "CATEGORY_ID"),
                            form_text("deadline", "2026-02-15"),
                            form_file("attachments"),
                        ]
                    ),
                ),
            },
            {"name": "Get My Job Posts (Client)", "request": req("GET", f"{BASE}/job-posts/my/posts", auth=True)},
            {
                "name": "Pay Premium (Client)",
                "request": req(
                    "POST",
                    f"{BASE}/job-posts/:jobPostId/pay-premium",
                    auth=True,
                    body=json_body({"paymentMethodId": "PAYMENT_METHOD_ID"}),
                ),
            },
            {
                "name": "Update Job Post (Client)",
                "request": req(
                    "PUT",
                    f"{BASE}/job-posts/:jobPostId",
                    auth=True,
                    body=form_body(
                        [
                            form_text("title", "Brand Campaign"),
                            form_text("description", "Updated details"),
                            form_text("budget", "1100"),
                            form_text("deadline", "2026-02-20"),
                            form_file("attachments"),
                        ]
                    ),
                ),
            },
            {
                "name": "Update Applicant Status (Client)",
                "request": req(
                    "PATCH",
                    f"{BASE}/job-posts/:jobPostId/applicants/:applicantId",
                    auth=True,
                    body=json_body({"status": "accepted"}),
                ),
            },
            {
                "name": "Close Job Post (Client)",
                "request": req(
                    "PATCH",
                    f"{BASE}/job-posts/:jobPostId/close",
                    auth=True,
                    body=json_body({"reason": "Filled"}),
                ),
            },
            {"name": "Delete Job Post (Client)", "request": req("DELETE", f"{BASE}/job-posts/:jobPostId", auth=True)},
        ],
    }
)

folders.append(
    {
        "name": "Orders",
        "item": [
            {
                "name": "Create Order From Gig (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/orders/from-gig/:gigId",
                    auth=True,
                    body=json_body({"requirements": "Need 20 photos", "scheduleDate": "2026-02-10"}),
                ),
            },
            {
                "name": "Create Order From Offer (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/orders/from-offer/:offerId",
                    auth=True,
                    body=json_body({"message": "Accepting offer"}),
                ),
            },
            {"name": "Get My Orders (Auth)", "request": req("GET", f"{BASE}/orders/my-orders", auth=True)},
            {"name": "Get Order By Id (Auth)", "request": req("GET", f"{BASE}/orders/:orderId", auth=True)},
            {
                "name": "Request Reschedule (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/orders/:orderId/reschedule",
                    auth=True,
                    body=json_body({"newDate": "2026-02-12", "note": "Change of plans"}),
                ),
            },
            {
                "name": "Respond To Reschedule (Auth)",
                "request": req(
                    "PATCH",
                    f"{BASE}/orders/:orderId/reschedule/:requestId",
                    auth=True,
                    body=json_body({"status": "accepted"}),
                ),
            },
            {
                "name": "Cancel Order (Auth)",
                "request": req(
                    "PATCH",
                    f"{BASE}/orders/:orderId/cancel",
                    auth=True,
                    body=json_body({"reason": "Client cancelled"}),
                ),
            },
            {
                "name": "Complete Order (Auth)",
                "request": req(
                    "PATCH",
                    f"{BASE}/orders/:orderId/complete",
                    auth=True,
                    body=json_body({"note": "Work delivered"}),
                ),
            },
        ],
    }
)
folders.append(
    {
        "name": "Drafts",
        "item": [
            {
                "name": "Submit Draft (Creative)",
                "request": req(
                    "POST",
                    f"{BASE}/drafts/orders/:orderId/drafts",
                    auth=True,
                    body=form_body([form_text("message", "First draft"), form_file("files")]),
                ),
            },
            {"name": "Get Order Drafts (Auth)", "request": req("GET", f"{BASE}/drafts/orders/:orderId/drafts", auth=True)},
            {"name": "Get Draft By Id (Auth)", "request": req("GET", f"{BASE}/drafts/:draftId", auth=True)},
            {
                "name": "Approve Draft (Client)",
                "request": req(
                    "PATCH",
                    f"{BASE}/drafts/:draftId/approve",
                    auth=True,
                    body=json_body({"message": "Looks good"}),
                ),
            },
            {
                "name": "Request Revision (Client)",
                "request": req(
                    "PATCH",
                    f"{BASE}/drafts/:draftId/request-revision",
                    auth=True,
                    body=json_body({"message": "Please adjust colors"}),
                ),
            },
            {
                "name": "Reject Draft (Client)",
                "request": req(
                    "PATCH",
                    f"{BASE}/drafts/:draftId/reject",
                    auth=True,
                    body=json_body({"message": "Not aligned"}),
                ),
            },
            {"name": "Delete Draft (Creative)", "request": req("DELETE", f"{BASE}/drafts/:draftId", auth=True)},
        ],
    }
)

folders.append(
    {
        "name": "Reviews",
        "item": [
            {"name": "Get Creative Reviews (Public)", "request": req("GET", f"{BASE}/reviews/users/:creativeId")},
            {"name": "Get Gig Reviews (Public)", "request": req("GET", f"{BASE}/reviews/gigs/:gigId")},
            {
                "name": "Create Review (Client)",
                "request": req(
                    "POST",
                    f"{BASE}/reviews/orders/:orderId",
                    auth=True,
                    body=json_body({"rating": 5, "comment": "Great work"}),
                ),
            },
            {"name": "Delete Review (Creative)", "request": req("DELETE", f"{BASE}/reviews/:reviewId", auth=True)},
        ],
    }
)

folders.append(
    {
        "name": "Notifications",
        "item": [
            {"name": "Get Notifications (Auth)", "request": req("GET", f"{BASE}/notifications", auth=True)},
            {"name": "Get Unread Count (Auth)", "request": req("GET", f"{BASE}/notifications/unread-count", auth=True)},
            {"name": "Mark As Read (Auth)", "request": req("PATCH", f"{BASE}/notifications/:notificationId/read", auth=True)},
            {"name": "Mark All As Read (Auth)", "request": req("PATCH", f"{BASE}/notifications/read-all", auth=True)},
            {"name": "Delete Notification (Auth)", "request": req("DELETE", f"{BASE}/notifications/:notificationId", auth=True)},
            {"name": "Clear All Notifications (Auth)", "request": req("DELETE", f"{BASE}/notifications/clear-all", auth=True)},
        ],
    }
)

folders.append(
    {
        "name": "Social",
        "item": [
            {
                "name": "Toggle Like (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/social/like",
                    auth=True,
                    body=json_body({"targetId": "TARGET_ID", "targetType": "gig"}),
                ),
            },
            {"name": "Get My Likes (Auth)", "request": req("GET", f"{BASE}/social/my-likes", auth=True)},
            {"name": "Get User Likers (Auth)", "request": req("GET", f"{BASE}/social/users/:userId/likers", auth=True)},
            {
                "name": "Block User (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/social/block",
                    auth=True,
                    body=json_body({"targetUserId": "USER_ID"}),
                ),
            },
            {"name": "Unblock User (Auth)", "request": req("DELETE", f"{BASE}/social/block/:targetUserId", auth=True)},
            {"name": "Get Blocked Users (Auth)", "request": req("GET", f"{BASE}/social/blocked-users", auth=True)},
            {
                "name": "Report User (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/social/report",
                    auth=True,
                    body=form_body([form_text("targetUserId", "USER_ID"), form_text("reason", "Spam"), form_file("evidence")]),
                ),
            },
            {"name": "Get My Reports (Auth)", "request": req("GET", f"{BASE}/social/my-reports", auth=True)},
        ],
    }
)
folders.append(
    {
        "name": "Portfolios",
        "item": [
            {"name": "Get Creative Portfolio (Public)", "request": req("GET", f"{BASE}/portfolios/creative/:creativeId")},
            {"name": "Get Portfolio By Id (Public)", "request": req("GET", f"{BASE}/portfolios/:portfolioId")},
            {
                "name": "Create Portfolio (Creative)",
                "request": req(
                    "POST",
                    f"{BASE}/portfolios",
                    auth=True,
                    body=form_body(
                        [
                            form_text("title", "Lifestyle Collection"),
                            form_text("description", "My best work"),
                            form_file("images"),
                            form_file("videos"),
                        ]
                    ),
                ),
            },
            {
                "name": "Update Portfolio (Creative)",
                "request": req(
                    "PUT",
                    f"{BASE}/portfolios/:portfolioId",
                    auth=True,
                    body=form_body(
                        [
                            form_text("title", "Lifestyle Collection"),
                            form_text("description", "Updated"),
                            form_file("images"),
                            form_file("videos"),
                        ]
                    ),
                ),
            },
            {"name": "Delete Portfolio (Creative)", "request": req("DELETE", f"{BASE}/portfolios/:portfolioId", auth=True)},
        ],
    }
)

folders.append(
    {
        "name": "Admin",
        "item": [
            {"name": "Dashboard Overview (Admin)", "request": req("GET", f"{BASE}/admin/dashboard", auth=True)},
            {"name": "Get All Users (Admin)", "request": req("GET", f"{BASE}/admin/users", auth=True)},
            {
                "name": "Toggle User Status (Admin)",
                "request": req(
                    "PATCH",
                    f"{BASE}/admin/users/:userId/toggle-status",
                    auth=True,
                    body=json_body({"status": "approved"}),
                ),
            },
            {"name": "Get Revenue Stats (Admin)", "request": req("GET", f"{BASE}/admin/revenue", auth=True)},
            {"name": "Get Payment History (Admin)", "request": req("GET", f"{BASE}/admin/payments", auth=True)},
            {
                "name": "Approve Payment (Admin)",
                "request": req(
                    "PATCH",
                    f"{BASE}/admin/payments/:transactionId/approve",
                    auth=True,
                    body=json_body({"status": "approved"}),
                ),
            },
            {"name": "Get Verification Requests (Admin)", "request": req("GET", f"{BASE}/admin/verifications", auth=True)},
            {
                "name": "Review Verification (Admin)",
                "request": req(
                    "PATCH",
                    f"{BASE}/admin/verifications/:verificationId",
                    auth=True,
                    body=json_body({"status": "approved", "notes": "Looks good"}),
                ),
            },
            {"name": "Get All Reports (Admin)", "request": req("GET", f"{BASE}/admin/reports", auth=True)},
            {
                "name": "Review Report (Admin)",
                "request": req(
                    "PATCH",
                    f"{BASE}/admin/reports/:reportId",
                    auth=True,
                    body=json_body({"status": "resolved", "notes": "Handled"}),
                ),
            },
        ],
    }
)

folders.append(
    {
        "name": "Categories",
        "item": [
            {"name": "Get All Categories (Public)", "request": req("GET", f"{BASE}/categories")},
            {"name": "Get Category By Id (Public)", "request": req("GET", f"{BASE}/categories/:categoryId")},
        ],
    }
)

folders.append(
    {
        "name": "Verifications",
        "item": [
            {
                "name": "Request Verification (Creative)",
                "request": req(
                    "POST",
                    f"{BASE}/verifications/request",
                    auth=True,
                    body=form_body([form_text("message", "Please verify my account"), form_file("documents")]),
                ),
            },
            {"name": "Get Verification Status (Creative)", "request": req("GET", f"{BASE}/verifications/my-status", auth=True)},
        ],
    }
)
folders.append(
    {
        "name": "Support",
        "item": [
            {
                "name": "Create Support Ticket (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/support/tickets",
                    auth=True,
                    body=form_body(
                        [
                            form_text("subject", "Payment issue"),
                            form_text("message", "Payment failed"),
                            form_file("attachments"),
                        ]
                    ),
                ),
            },
            {"name": "Get My Tickets (Auth)", "request": req("GET", f"{BASE}/support/my-tickets", auth=True)},
            {"name": "Get Ticket By Id (Auth)", "request": req("GET", f"{BASE}/support/tickets/:ticketId", auth=True)},
            {
                "name": "Rate Ticket (Auth)",
                "request": req(
                    "PATCH",
                    f"{BASE}/support/tickets/:ticketId/rate",
                    auth=True,
                    body=json_body({"rating": 5, "feedback": "Resolved quickly"}),
                ),
            },
            {
                "name": "Update Ticket Status (Admin)",
                "request": req(
                    "PATCH",
                    f"{BASE}/support/tickets/:ticketId/status",
                    auth=True,
                    body=json_body({"status": "closed"}),
                ),
            },
        ],
    }
)

folders.append(
    {
        "name": "Website",
        "item": [
            {"name": "Get Website Content (Public)", "request": req("GET", f"{BASE}/website")},
            {
                "name": "Create Hero Section (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/website/hero",
                    auth=True,
                    body=form_body([form_text("title", "Welcome"), form_text("subtitle", "Discover creatives"), form_file("image")]),
                ),
            },
            {
                "name": "Update Hero Section (Auth)",
                "request": req(
                    "PUT",
                    f"{BASE}/website/hero",
                    auth=True,
                    body=form_body([form_text("title", "Welcome"), form_text("subtitle", "Updated"), form_file("image")]),
                ),
            },
            {"name": "Get Hero Section (Public)", "request": req("GET", f"{BASE}/website/hero")},
            {
                "name": "Create About Section (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/website/about",
                    auth=True,
                    body=form_body([form_text("title", "About"), form_text("content", "About content"), form_file("image")]),
                ),
            },
            {
                "name": "Update About Section (Auth)",
                "request": req(
                    "PUT",
                    f"{BASE}/website/about",
                    auth=True,
                    body=form_body([form_text("title", "About"), form_text("content", "Updated"), form_file("image")]),
                ),
            },
            {"name": "Get About Section (Public)", "request": req("GET", f"{BASE}/website/about")},
            {
                "name": "Create Creative Section (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/website/creative",
                    auth=True,
                    body=form_body([form_text("title", "Creatives"), form_text("content", "Creative section"), form_file("heroImage"), form_file("images")]),
                ),
            },
            {
                "name": "Update Creative Section (Auth)",
                "request": req(
                    "PUT",
                    f"{BASE}/website/creative",
                    auth=True,
                    body=form_body([form_text("title", "Creatives"), form_text("content", "Updated"), form_file("heroImage"), form_file("images")]),
                ),
            },
            {"name": "Get Creative Section (Public)", "request": req("GET", f"{BASE}/website/creative")},
            {
                "name": "Create Client Section (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/website/client",
                    auth=True,
                    body=form_body([form_text("title", "Clients"), form_text("content", "Client section"), form_file("image")]),
                ),
            },
            {
                "name": "Update Client Section (Auth)",
                "request": req(
                    "PUT",
                    f"{BASE}/website/client",
                    auth=True,
                    body=form_body([form_text("title", "Clients"), form_text("content", "Updated"), form_file("image")]),
                ),
            },
            {"name": "Get Client Section (Public)", "request": req("GET", f"{BASE}/website/client")},
            {
                "name": "Create Contact Section (Auth)",
                "request": req(
                    "POST",
                    f"{BASE}/website/contact",
                    auth=True,
                    body=json_body({"email": "support@example.com", "phone": "+1234567890", "address": "Main Street"}),
                ),
            },
            {
                "name": "Update Contact Section (Auth)",
                "request": req(
                    "PUT",
                    f"{BASE}/website/contact",
                    auth=True,
                    body=json_body({"email": "support@example.com", "phone": "+1234567890", "address": "Main Street"}),
                ),
            },
            {"name": "Get Contact Section (Public)", "request": req("GET", f"{BASE}/website/contact")},
        ],
    }
)

collection = {
    "info": {
        "name": "GlenKhumalo API - Postman Documentation",
        "_postman_id": "9b7d2b3f-8f06-4f75-9d8b-6d8c3b0d9e5a",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [
        {"key": "serverUrl", "value": "http://localhost:5000"},
        {"key": "baseUrl", "value": "http://localhost:5000/api/v1"},
        {"key": "accessToken", "value": "REPLACE_ME"},
    ],
    "item": folders,
}

with open("GlenKhumalo_Postman_Documentation.json", "w", encoding="utf-8") as f:
    json.dump(collection, f, indent=2)
