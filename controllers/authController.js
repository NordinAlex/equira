const login = (req, res) => {
    const {username, password } = req.body;

    console.log(username);
    console.log(password);

    req.session.user = {
        username: username
    };

    res.redirect("/dashboard");
};

module.exports = { login };