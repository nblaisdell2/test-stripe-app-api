USE [TestStripe]
GO

/****** Object:  StoredProcedure [dbo].[sp_CreateUser]    Script Date: 7/30/2023 10:42:20 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Nicolas Blaisdell
-- Create date: 07/30/2023
-- Description:	Creates a new user for the Test Stripe app
-- =============================================
CREATE PROCEDURE [dbo].[sp_CreateUser]
	-- Add the parameters for the stored procedure here
	@UserEmail VARCHAR(255) = null
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON;

    -- Insert statements for procedure here
	IF NOT EXISTS (SELECT 1 FROM Users WHERE UserEmail = @UserEmail)
	BEGIN
		CREATE TABLE #NewUserID(UserID UNIQUEIDENTIFIER);
		DECLARE @NewUserID UNIQUEIDENTIFIER;

		-- Extract the username from the provided email, by getting rid of everything
		-- after and including the '@' sign in the email
		DECLARE @UserName VARCHAR(255) = SUBSTRING(@UserEmail, 1, CHARINDEX('@', @UserEmail) - 1);
		
		-- Add a new record to the 'Users' table and output the auto-generated UserID value
		INSERT INTO Users(UserName, UserEmail) 
		OUTPUT inserted.UserID 
		INTO #NewUserID
		VALUES (@UserName, @UserEmail)
		
		SET @NewUserID = (SELECT UserID FROM #NewUserID);

		-- Initialize the 'Activity' table for this user, setting the starting counter
		-- value to 0
		INSERT INTO Activity(UserID, CurrCount)
			VALUES (@NewUserID, 0) 

		-- TODO: Setup subscription details here
	END
END
GO

/****** Object:  StoredProcedure [dbo].[sp_GetUser]    Script Date: 7/30/2023 10:42:21 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Nicolas Blaisdell
-- Create date: 07/30/2023
-- Description:	Gets the user details, current count and subscription details
--				for the Test Stripe app
-- =============================================
CREATE PROCEDURE [dbo].[sp_GetUser]
	-- Add the parameters for the stored procedure here
	@UserEmail VARCHAR(255) = null
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON;

    -- Insert statements for procedure here
	SELECT 
		u.UserID, 
		u.UserName, 
		u.UserEmail, 
		a.CurrCount, 
		sd.SubscriptionStatus, 
		sd.IsInTrial, 
		sd.StartDateTime, 
		sd.EndDateTime
	FROM Users u
	JOIN Activity a ON u.UserID = a.UserID
	LEFT JOIN SubscriptionDetails sd ON u.UserID = sd.UserID
END
GO

/****** Object:  StoredProcedure [dbo].[sp_UpdateCount]    Script Date: 7/30/2023 10:42:21 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Nicolas Blaisdell
-- Create date: 07/30/2023
-- Description:	Gets the user details, current count and subscription details
--				for the Test Stripe app
-- =============================================
CREATE PROCEDURE [dbo].[sp_UpdateCount]
	-- Add the parameters for the stored procedure here
	@UserID UNIQUEIDENTIFIER = null,
	@NewCount INT = null
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON;

    -- Insert statements for procedure here
	UPDATE a
	SET a.CurrCount = @NewCount
	FROM Activity a
	WHERE a.UserID = @UserID
END
GO

/****** Object:  StoredProcedure [dbo].[sp_UpdateSubscription]    Script Date: 7/30/2023 10:42:21 AM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Nicolas Blaisdell
-- Create date: 07/30/2023
-- Description:	Updates the subscription details for a particular
--				user when submitting a payment to Stripe
-- =============================================
CREATE PROCEDURE [dbo].[sp_UpdateSubscription]
	-- Add the parameters for the stored procedure here
	@UserID UNIQUEIDENTIFIER = null
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON;

	-- TODO: Update subscription details here
END
GO


