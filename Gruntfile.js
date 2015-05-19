module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: ';'
            },
            dist: {
                src: ['public/app/app.js', 'public/components/language.js',
                    'public/app/directives.js', 'public/app/filters.js',
                    'public/app/httpInterceptor.js', 'public/app/routes.js', 'public/app/administrative/**/*.js',
                    'public/app/common/**/*.js', 'public/app/enrolment/**/*.js', 'public/app/exam/**/*.js',
                    'public/app/facility/**/*.js', 'public/app/question/**/*.js', 'public/app/reservation/**/*.js',
                    'public/app/review/**/*.js', 'public/app/utility/**/*.js'],
                dest: 'dist/<%= pkg.name %>.js'
            }
        },
        ngAnnotate: {
            dist: {
                files: {
                    'dist/exam.js': ['dist/exam.js']
                }
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
            },
            dist: {
                files: {
                    'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-ng-annotate');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.registerTask('default', ['concat', 'ngAnnotate', 'uglify']);
};

